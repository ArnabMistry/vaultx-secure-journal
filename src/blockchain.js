// src/blockchain.js
// Blockchain helper to produce hash-chained tamper-log entries (blocks)
// Works with your existing storage.js (appendTamperLog, loadTamperLog, etc.)

import * as ExpoCrypto from "expo-crypto";
import * as storage from "./storage"; // your storage.js
import { randomHex } from "./crypto"; // your crypto.js helper
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Block blueprint:
 * {
 *   seq: number,
 *   ts: string,
 *   event: string,
 *   detail?: string,
 *   id?: string,
 *   file?: string,
 *   hash?: string,
 *   custody?: string,
 *   signature?: string,
 *   prevHash?: string|null,
 *   blockHash?: string,
 *   nonce?: string
 * }
 */

/* ---------- helpers ---------- */

// canonical string used to compute blockHash
function canonicalStringForBlock(b) {
  // blueprint order: seq|ts|event|detail|id|file|hash|signature|prevHash
  const parts = [
    String(b.seq || ""),
    b.ts || "",
    b.event || "",
    b.detail || "",
    b.id || "",
    b.file || "",
    b.hash || "",
    b.signature || "",
    b.prevHash || ""
  ];
  return parts.join("|");
}

// sha256 hex using ExpoCrypto (returns lowercase hex)
async function sha256Hex(input) {
  return await ExpoCrypto.digestStringAsync(ExpoCrypto.CryptoDigestAlgorithm.SHA256, String(input));
}

/* ---------- migration helper ---------- */

/**
 * ensureMigrated()
 * - If stored tamper log items are missing seq/prevHash/blockHash, rebuild a canonical
 *   chain (chronological order), compute seq/prevHash/blockHash consistently and write back.
 * - After migration the stored array remains newest-first (to keep compatibility with storage.appendTamperLog which unshifts).
 */
async function ensureMigrated() {
  try {
    const raw = (await storage.loadTamperLog()) || [];
    if (!Array.isArray(raw) || raw.length === 0) return;

    // If every item already has blockHash and prevHash defined, no migration required.
    const needMigration = raw.some(item => !item || !item.blockHash || (typeof item.prevHash === "undefined"));
    if (!needMigration) return;

    // Convert to chronological (oldest-first)
    const chronological = [...raw].reverse();

    const rebuilt = [];
    let prevHash = null;
    for (let i = 0; i < chronological.length; i++) {
      const item = chronological[i] || {};
      // prefer existing ISO ts fields: ts or timestamp
      const tsISO = (() => {
        try {
          const d = new Date(item.ts || item.timestamp || "");
          return isNaN(d.getTime()) ? (item.ts || item.timestamp || new Date().toISOString()) : d.toISOString();
        } catch {
          return item.ts || item.timestamp || new Date().toISOString();
        }
      })();

      const block = {
        // re-sequence cleanly
        seq: i + 1,
        ts: tsISO,
        nonce: item.nonce || (await randomHex(8)),
        event: item.event || item.type || "event",
        detail: (item.detail || item.message || "") + "",
        id: item.id,
        file: item.file,
        hash: item.hash,
        custody: item.custody,
        signature: item.signature,
        // prevHash set from previous rebuilt block
        prevHash: prevHash || null
      };

      // compute blockHash for canonical block
      const canon = canonicalStringForBlock(block);
      const computed = await sha256Hex(canon);
      block.blockHash = computed;

      // preserve any other raw fields (so we don't drop unexpected metadata)
      block._raw = item._raw || item;

      // set prevHash for next iteration
      prevHash = block.blockHash;

      rebuilt.push(block);
    }

    // Convert rebuilt (chronological) into newest-first (storage format)
    const newestFirst = [...rebuilt].reverse();

    // Persist: overwrite the ASYNC_TAMPERLOG_KEY with the rebuilt array (newest-first)
    // Use the same key that your storage.js uses for tamper log.
    const key = storage.ASYNC_TAMPERLOG_KEY || "vault_tamper_log";
    await AsyncStorage.setItem(key, JSON.stringify(newestFirst));
  } catch (e) {
    // migration should not crash app; log and continue
    console.warn("blockchain.ensureMigrated failed", e);
  }
}

/* ---------- main API ---------- */

/**
 * appendEvent(ev)
 * - ev: partial block object (event, detail, id, file, hash, custody, signature optional)
 * Creates seq/ts/nonce/prevHash/blockHash and stores via storage.appendTamperLog()
 * Returns the saved block object (with blockHash).
 */
export async function appendEvent(ev = {}) {
  // ensure all existing logs have canonical hashes / prev links
  await ensureMigrated();

  // Load existing (newest-first)
  const existing = (await storage.loadTamperLog()) || [];

  // find highest seq among existing (some legacy items might have seq)
  let lastSeq = 0;
  let lastBlockHash = null;
  if (existing.length > 0) {
    for (const it of existing) {
      if (typeof it.seq === "number" && it.seq > lastSeq) lastSeq = it.seq;
    }
    // find item with max seq to choose prevHash (robust even if array order changed)
    const maxSeqItem = existing.reduce((acc, cur) => {
      if (!acc) return cur;
      return (typeof cur.seq === "number" && cur.seq > (acc.seq || 0)) ? cur : acc;
    }, null);
    if (maxSeqItem && maxSeqItem.blockHash) lastBlockHash = maxSeqItem.blockHash;
  }

  const seq = lastSeq + 1;
  const ts = new Date().toISOString();
  const nonce = await randomHex(8);

  const block = {
    seq,
    ts,
    nonce,
    event: ev.event || ev.type || "event",
    detail: ev.detail || ev.message || "",
    id: ev.id,
    file: ev.file,
    hash: ev.hash,
    custody: ev.custody,
    signature: ev.signature,
    prevHash: lastBlockHash || null,
  };

  // compute canonical block hash
  const canon = canonicalStringForBlock(block);
  const computed = await sha256Hex(canon);

  block.blockHash = computed;

  // Persist block -> reuse storage.appendTamperLog (which unshifts into the array)
  await storage.appendTamperLog(block);

  return block;
}

/**
 * loadChain()
 * returns normalized array of blocks (chronological order oldest-first)
 */
export async function loadChain() {
  // ensure migration before returning chain
  await ensureMigrated();
  const raw = (await storage.loadTamperLog()) || [];
  // storage returns newest-first (unshift), so reverse to chronological
  const chronological = Array.isArray(raw) ? [...raw].reverse() : [];
  return chronological;
}

/**
 * computeBlockHash(block)
 * - returns SHA-256 hex computed from canonical string
 * - does NOT change storage
 */
export async function computeBlockHash(block) {
  return await sha256Hex(canonicalStringForBlock(block));
}

/**
 * verifyChain()
 * - recomputes block hashes and prev relationships, returns verification details
 * - returns { ok: boolean, breaks: number, head: string|null, details: [...] }
 */
export async function verifyChain() {
  // ensure migration first (so fields exist)
  await ensureMigrated();
  const chain = await loadChain();
  if (!chain || chain.length === 0) {
    return { ok: true, breaks: 0, head: null, details: [] };
  }
  let prev = null;
  let breaks = 0;
  const details = [];
  for (let i = 0; i < chain.length; i++) {
    const r = chain[i];
    const computed = await computeBlockHash(r);
    const prevMatches = ((r.prevHash || "") === (prev || ""));
    const blockMatches = ((r.blockHash || "") === (computed || ""));
    if (!prevMatches || !blockMatches) breaks++;
    details.push({
      seq: r.seq,
      computed,
      stored: r.blockHash || null,
      prevStored: r.prevHash || null,
      prevMatches,
      blockMatches
    });
    prev = r.blockHash || computed || null;
  }
  const head = prev;
  return { ok: breaks === 0, breaks, head, details };
}

/**
 * getHeadFingerprint()
 * - returns last block's blockHash (or null)
 */
export async function getHeadFingerprint() {
  const chain = await loadChain();
  if (!chain || chain.length === 0) return null;
  const last = chain[chain.length - 1];
  return last.blockHash || null;
}

/**
 * exportChainFiles(outputDir)
 * - writes JSONL and manifest to FileSystem.documentDirectory or cacheDirectory
 * - returns { jsonlPath, manifestPath, chainHead }
 */
export async function exportChainFiles() {
  const now = new Date().toISOString();
  const base = `audit_${now.replace(/[:.]/g, "-")}`;
  const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!dir) throw new Error("No filesystem directory available for export.");

  const chain = await loadChain();
  const lines = chain.map((r) => JSON.stringify(r));
  const jsonlPath = `${dir}${base}.jsonl`;
  await FileSystem.writeAsStringAsync(jsonlPath, lines.join("\n"), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const verification = await verifyChain();
  const manifest = {
    exportedAt: now,
    timezone: "UTC",
    algorithms: { hash: "SHA-256", encryption: "AES-256-CBC (data store)", hmac: "HMAC-SHA256" },
    count: chain.length,
    chainHead: verification.head || null,
    verify: { ok: verification.ok, breaks: verification.breaks },
  };

  const manifestPath = `${dir}${base}.manifest.json`;
  await FileSystem.writeAsStringAsync(manifestPath, JSON.stringify(manifest, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { jsonlPath, manifestPath, chainHead: verification.head || null };
}
