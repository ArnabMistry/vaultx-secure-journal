// src/components/AuditModal.js
import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system";
import * as ExpoCrypto from "expo-crypto";
import styles from "../styles";
import { loadTamperLog } from "../storage";
import { shortHex } from "../crypto";
import * as blockchain from "../blockchain";
// const result = await blockchain.verifyChain();

// Note: expo-sharing is optional in some CI images. Guard usage.
let Sharing = null;
try {
  // eslint-disable-next-line global-require
  Sharing = require("expo-sharing");
} catch (e) {
  Sharing = null;
}

/**
 * AuditModal
 * Props:
 *  - visible (bool)
 *  - onClose (fn)
 *  - meta (object) - { pbkdf2Iterations, created, saltTruncated, ... }
 *  - lastVerifiedAt (string)
 *
 * Expected tamper log entries (best-effort):
 * {
 *   seq, ts (ISO), event, detail?, id?, file?, hash?, custody?, signature?, prevHash?, blockHash?
 * }
 */
export default function AuditModal({ visible, onClose, meta = {}, lastVerifiedAt }) {
  const [tamperLog, setTamperLog] = useState([]);
  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState(null); // { ok: bool, breaks: number, head: string | null }
  const [showFull, setShowFull] = useState(false);
  const [headFingerprint, setHeadFingerprint] = useState("n/a");

  // Try to optionally load app crypto helpers (you don't require a sign function).
  let appCrypto = null;
  try {
    // from src/crypto.js - available helpers: shortHex, hexToWordArray, etc.
    // dynamic require path: component is at src/components -> crypto at ../crypto
    // eslint-disable-next-line global-require
    appCrypto = require("../crypto");
  } catch (e) {
    appCrypto = null;
  }

  // helper: compute SHA-256 hex using ExpoCrypto
  const sha256Hex = async (input) => {
    try {
      // ExpoCrypto.digestStringAsync returns lowercase hex for SHA256
      const hex = await ExpoCrypto.digestStringAsync(ExpoCrypto.CryptoDigestAlgorithm.SHA256, String(input));
      return hex;
    } catch (e) {
      return null;
    }
  };

  // optional signing if you later add signEd25519 to crypto.js and store private key in SecureStore
  const ed25519SignIfAvailable = async (msgHex) => {
    try {
      if (appCrypto && typeof appCrypto.signEd25519 === "function") {
        const priv = await SecureStore.getItemAsync("AUDIT_SIGNING_PRIV"); // hex/base64 private key
        if (!priv) return null;
        // expect signEd25519(msgHex, priv) -> signature hex or base64
        const sig = await appCrypto.signEd25519(msgHex, priv);
        return sig || null;
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  // Normalize tamper log entries to a canonical form
  const normalized = useMemo(() => {
    return (tamperLog || []).map((r, i) => {
      const tsISO = (() => {
        try {
          const d = new Date(r.ts || r.timestamp || "");
          return isNaN(d.getTime()) ? (r.ts || r.timestamp || "") : d.toISOString();
        } catch (e) {
          return r.ts || r.timestamp || "";
        }
      })();

      return {
        seq: typeof r.seq === "number" ? r.seq : i + 1,
        ts: tsISO,
        event: r.event || "event",
        detail: r.detail || r.message || "",
        id: r.id,
        file: r.file,
        hash: r.hash,
        custody: r.custody,
        signature: r.signature,
        prevHash: r.prevHash,
        blockHash: r.blockHash,
        _raw: r,
      };
    });
  }, [tamperLog]);

  // chain head from normalized array (last item blockHash)
  const chainHead = useMemo(() => {
    if (!normalized || normalized.length === 0) return null;
    return normalized[normalized.length - 1].blockHash || null;
  }, [normalized]);

  // Refresh log when modal shows
    useEffect(() => {
      if (!visible) return;
      (async () => {
        try {
          // Load raw tamper log (existing storage)
          const log = await loadTamperLog();
          setTamperLog(Array.isArray(log) ? log : []);
          // Reset verification status on open
          setVerifyStatus(null);
  
          // Prefer blockchain.getHeadFingerprint() when available.
          if (blockchain && typeof blockchain.getHeadFingerprint === "function") {
            try {
              const head = await blockchain.getHeadFingerprint();
              setHeadFingerprint(head || "n/a");
            } catch (e) {
              // fallback to computed chainHead (may be "n/a")
              setHeadFingerprint(chainHead || "n/a");
            }
          } else {
            setHeadFingerprint(chainHead || "n/a");
          }
        } catch (e) {
          setTamperLog([]);
          setHeadFingerprint("n/a");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      })();
    }, [visible]);
  

  // Compute the canonical block hash for an entry using the same blueprint
  // blueprint: seq|ts|event|detail|id|file|hash|signature|prevHash
  const computeBlockHash = async (r) => {
    const mat = [
      String(r.seq),
      r.ts || "",
      r.event || "",
      r.detail || "",
      r.id || "",
      r.file || "",
      r.hash || "",
      r.signature || "",
      r.prevHash || "",
    ].join("|");
    return await sha256Hex(mat);
  };

  // Verify chain function
    // Verify chain function - prefer blockchain.verifyChain() if available
    const verifyChain = async () => {
      setVerifying(true);
      try {
        // If blockchain module present, use its verifyChain (reads storage internally)
        if (blockchain && typeof blockchain.verifyChain === "function") {
          const res = await blockchain.verifyChain();
          // res: { ok, breaks, head, details }
          setVerifyStatus({ ok: !!res.ok, breaks: res.breaks || 0, head: res.head || null });
          setHeadFingerprint(res.head || "n/a");
          return;
        }
  
        // Fallback: verify using normalized array (your previous logic)
        if (!normalized || normalized.length === 0) {
          setVerifyStatus({ ok: true, breaks: 0, head: null });
          setHeadFingerprint(null);
          return;
        }
  
        // Check SHA-256 availability via ExpoCrypto
        const test = await sha256Hex("");
        if (!test) {
          setVerifyStatus({ ok: false, breaks: normalized.length, head: chainHead });
          Alert.alert("Verification unavailable", "SHA-256 is not available.");
          return;
        }
  
        let breaks = 0;
        let prev = null;
        for (let i = 0; i < normalized.length; i++) {
          const r = normalized[i];
          const computed = await computeBlockHash(r);
          const prevMatches = (r.prevHash || "") === (prev || "");
          const blockMatches = (r.blockHash || "") === (computed || "");
          if (!prevMatches || !blockMatches) breaks++;
          prev = r.blockHash || computed || null;
        }
        setVerifyStatus({ ok: breaks === 0, breaks, head: prev });
        setHeadFingerprint(prev || null);
      } catch (e) {
        setVerifyStatus({ ok: false, breaks: normalized.length, head: chainHead });
        Alert.alert("Verification error", e?.message || String(e));
      } finally {
        setVerifying(false);
      }
    };
  

  // Export evidence (JSONL + manifest + optional signature file)
  const exportEvidence = async () => {
    try {
      const now = new Date().toISOString();
      const baseName = `audit_${now.replace(/[:.]/g, "-")}`;
      const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!dir) throw new Error("No writable directory available on this platform.");

      // JSONL: one JSON object per line
      const lines = normalized.map((r) =>
        JSON.stringify({
          seq: r.seq,
          ts: r.ts,
          event: r.event,
          detail: r.detail,
          id: r.id,
          file: r.file,
          hash: r.hash,
          custody: r.custody,
          signature: r.signature,
          prevHash: r.prevHash,
          blockHash: r.blockHash,
        })
      );

      const jsonlPath = `${dir}${baseName}.jsonl`;
      await FileSystem.writeAsStringAsync(jsonlPath, lines.join("\n"), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // manifest
      const header = {
        exportedAt: now,
        timezone: "UTC",
        algorithms: {
          encryption: "AES-256-CBC",
          hmac: "HMAC-SHA256",
          kdf: `PBKDF2(${(meta && meta.pbkdf2Iterations) || "stored"})`,
          hash: "SHA-256",
          signature: "Ed25519 (optional)",
        },
        created: (meta && meta.created) || "stored",
        saltTruncated: (meta && meta.saltTruncated) || "stored",
        lastVerifiedAt: lastVerifiedAt || "never",
      };

      const manifest = {
        header,
        count: normalized.length,
        chainHead: (verifyStatus && verifyStatus.head) || chainHead || null,
      };

      const manifestPath = `${dir}${baseName}.manifest.json`;
      await FileSystem.writeAsStringAsync(manifestPath, JSON.stringify(manifest, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Optional detached signature: hash JSONL and attempt to sign (if signEd25519 exists)
      let sigPath = null;
      const jsonlData = await FileSystem.readAsStringAsync(jsonlPath, { encoding: FileSystem.EncodingType.UTF8 });
      const jsonlHash = await sha256Hex(jsonlData || "");
      // try to sign via appCrypto.signEd25519 if present
      if (appCrypto && typeof appCrypto.signEd25519 === "function") {
        const priv = await SecureStore.getItemAsync("AUDIT_SIGNING_PRIV");
        if (priv) {
          try {
            const sig = await appCrypto.signEd25519(jsonlHash, priv);
            if (sig) {
              sigPath = `${dir}${baseName}.jsonl.sig`;
              await FileSystem.writeAsStringAsync(
                sigPath,
                JSON.stringify({ algo: "Ed25519", hashAlgo: "SHA-256", jsonlHash, signature: sig }, null, 2),
                { encoding: FileSystem.EncodingType.UTF8 }
              );
            }
          } catch (e) {
            // signing failed; continue without signature
          }
        }
      }

      // Share / expose files
      const files = [jsonlPath, manifestPath].concat(sigPath ? [sigPath] : []);
      // Use expo-sharing if available; otherwise show paths in an alert
      if (Platform.OS !== "web" && Sharing && typeof Sharing.isAvailableAsync === "function") {
        const available = await Sharing.isAvailableAsync();
        if (available) {
          // share the primary JSONL file; user can access manifest/sig from same folder
          await Sharing.shareAsync(jsonlPath, { mimeType: "text/plain" });
        } else {
          Alert.alert("Export saved", `Files saved to: ${dir}\n${baseName}.jsonl\n${baseName}.manifest.json${sigPath ? `\n${baseName}.jsonl.sig` : ""}`);
        }
      } else {
        Alert.alert("Export saved", `Files saved to: ${dir}\n• ${baseName}.jsonl\n• ${baseName}.manifest.json${sigPath ? `\n• ${baseName}.jsonl.sig` : ""}`);
      }
    } catch (e) {
      Alert.alert("Export failed", e?.message || "Unknown error");
    }
  };

  // short helper for display
  const short = (v, left = 10, right = 10) =>
    !v ? "n/a" : (v.length <= left + right + 3 ? v : `${v.slice(0, left)}...${v.slice(-right)}`);

  // color mapping
  const colorForEvent = (ev = "") => {
    const e = (ev || "").toLowerCase();
    if (e.includes("tamper") || e.includes("fail") || e.includes("panic")) return "#ff6262";
    if (e.includes("warning")) return "#ffc85a";
    if (e.includes("verify") || e.includes("unlocked") || e.includes("entry_added")) return "#8cffb7";
    return "#d0d0d0";
  };

  const displayHead = (showFull ? (headFingerprint || "n/a") : short(headFingerprint || "n/a", 12, 12));

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalBoxLarge, { backgroundColor: "#0b0b0b" }]}>
          <Text style={[styles.modalTitle]}>Audit / Forensic Log</Text>

          <View style={{ backgroundColor: "#070707", borderColor: "#1c1c1c", borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 6 }}>
            <Text style={{ color: "#9ad4a5", fontFamily: "monospace" }}>
              ENC: AES-256-CBC | MAC: HMAC-SHA256
            </Text>
            <Text style={{ color: "#9ad4a5", fontFamily: "monospace", marginTop: 2 }}>
              KDF: PBKDF2({(meta && meta.pbkdf2Iterations) || "stored"})
            </Text>
            <Text style={{ color: "#9ad4a5", fontFamily: "monospace", marginTop: 2 }}>
              Created: {(meta && meta.created) || "stored"} | Salt: {(meta && meta.saltTruncated) || "stored"}
            </Text>
            <Text style={{ color: "#9ad4a5", fontFamily: "monospace", marginTop: 2 }}>
              Last Verify: {lastVerifiedAt || "never"} | TZ: UTC
            </Text>
            <Text style={{ color: "#6cff82", fontFamily: "monospace", marginTop: 6 }}>
              Chain Head: {displayHead}
            </Text>
            {verifyStatus && (
              <Text style={{ color: verifyStatus.ok ? "#8cffb7" : "#ff6262", fontFamily: "monospace", marginTop: 2 }}>
                Chain Status: {verifyStatus.ok ? "OK" : `BREAKS: ${verifyStatus.breaks}`}
              </Text>
            )}
          </View>

          <ScrollView style={{ maxHeight: 380, backgroundColor: "#0d0d0d", padding: 10, marginTop: 10 }}>
            <Text style={{ color: "#6cff82", fontFamily: "monospace" }}>
              LOG ({normalized.length})
            </Text>

            <View style={{ marginTop: 6 }}>
              {normalized.map((log) => {
                const c = colorForEvent(log.event);
                return (
                  <View key={`${log.seq}-${log.ts}`} style={{ marginBottom: 8 }}>
                    <Text style={{ fontFamily: "monospace", color: c }}>
                      [{log.seq}] {log.ts} • {log.event}
                      {log.detail ? ` (${log.detail})` : ""}{log.id ? ` • id=${log.id}` : ""}
                    </Text>

                    <Text style={{ fontFamily: "monospace", color: "#bdbdbd" }}>
                      prev={showFull ? (log.prevHash || "N/A") : short(log.prevHash)}  blk={showFull ? (log.blockHash || "N/A") : short(log.blockHash)}
                    </Text>

                    {log.file || log.hash || log.custody || log.signature ? (
                      <Text style={{ fontFamily: "monospace", color: "#9aa3a7" }}>
                        {log.file ? `file=${log.file}  ` : ""}{log.hash ? `hash=${showFull ? log.hash : short(log.hash)}  ` : ""}
                        {log.custody ? `custody="${log.custody}"  ` : ""}{log.signature ? `sig=${showFull ? log.signature : short(log.signature, 8, 8)}` : ""}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.buttonSecondary, { flex: 1, marginRight: 8 }]}
              onPress={verifyChain}
              disabled={verifying}
            >
              <Text style={styles.buttonText}>{verifying ? "Verifying…" : "Verify Chain"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buttonSecondary, { flex: 1, marginRight: 8 }]}
              onPress={() => setShowFull((s) => !s)}
            >
              <Text style={styles.buttonText}>{showFull ? "Compact View" : "Show Full"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buttonPrimary, { flex: 1 }]}
              onPress={exportEvidence}
            >
              <Text style={styles.buttonText}>Download Audit Log</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 10 }}>
            <Text style={{ color: "#7f8c8d", fontSize: 12 }}>
              Tip: Record the Chain Head fingerprint externally to strengthen provenance (email it to yourself or print).
            </Text>
          </View>

          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <TouchableOpacity style={[styles.buttonPrimary, { flex: 1 }]} onPress={onClose}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
