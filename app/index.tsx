// src/index.tsx
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Platform,
  FlatList,
  ActivityIndicator,
} from "react-native";

import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import * as ScreenCapture from "expo-screen-capture";

import styles from "../src/styles";
import * as crypto from "../src/crypto";
import * as storage from "../src/storage";
import PanicModal from "../src/components/PanicModal";
import AuditModal from "../src/components/AuditModal";
import EntryCard from "../src/components/EntryCard";


const PBKDF2_ITERATIONS = 100000;

// Define types for entry and tamper log items
interface Entry {
  id: string;
  iv: string;
  ciphertext: string;
  hmac: string;
  timestamp: string;
}

interface TamperLogItem {
  ts: string;
  event: string;
  detail?: string;
  id?: string;
}

export default function App() {
  // vault state
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [locked, setLocked] = useState(true);
  const [masterKeyHex, setMasterKeyHex] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tamperLog, setTamperLog] = useState<TamperLogItem[]>([]);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string | null>(null);
  const [vaultMeta, setVaultMeta] = useState<{ biometricEnabled: boolean }>({ biometricEnabled: false });

  const [setupPassA, setSetupPassA] = useState<string>("");
  const [setupPassB, setSetupPassB] = useState<string>("");
  const [unlockPass, setUnlockPass] = useState<string>("");
  const [newEntryText, setNewEntryText] = useState<string>("");
  const [viewingEntryPlain, setViewingEntryPlain] = useState<{ id: string; text: string } | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [integrityStatus, setIntegrityStatus] = useState<string>("Unknown");

  // panic modal states
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [panicConfirmText, setPanicConfirmText] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const wrapped = await SecureStore.getItemAsync(storage.SECUREKEY_WRAPPED);
        const salt = await SecureStore.getItemAsync(storage.SECUREKEY_SALT);
        const iter = await SecureStore.getItemAsync(storage.SECUREKEY_ITER);
        const metaJson = await storage.storageGetMeta();
        const meta = metaJson ? metaJson : { biometricEnabled: false };
        setVaultMeta(meta);

        if (wrapped && salt && iter) {
          setInitialized(true);
          setLocked(true);
          await refreshData();
        } else {
          setInitialized(false);
        }
      } catch (e) {
        console.warn("Startup error", e);
        setInitialized(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Prevent screenshots when unlocked, allow when locked
  useEffect(() => {
    (async () => {
      if (!locked) {
        try {
          await ScreenCapture.preventScreenCaptureAsync();
        } catch (e) {
          console.warn("preventScreenCapture failed", e);
        }
      } else {
        try {
          await ScreenCapture.allowScreenCaptureAsync();
        } catch (e) {}
      }
    })();
  }, [locked]);

  async function refreshData() {
    const e = await storage.loadEntries();
    setEntries(e);
    const t = await storage.loadTamperLog();
    setTamperLog(t);
  }

  /* ---------------------------
     Setup: create vault
  --------------------------- */
  async function handleCreateVault() {
    if (!setupPassA || setupPassA !== setupPassB) {
      Alert.alert("Passphrase mismatch", "Ensure passphrase and confirmation match.");
      return;
    }
    if (setupPassA.length < 12) {
      Alert.alert("Weak passphrase", "Use 12+ characters.");
      return;
    }
    setLoading(true);
    try {
      const masterHex = await crypto.randomHex(32);
      const saltHex = await crypto.randomHex(16);
      const wrapIvHex = await crypto.randomHex(16);

      const wrapKeyWA = crypto.deriveKeyPBKDF2(setupPassA, saltHex, PBKDF2_ITERATIONS);

      const wrapped = crypto.wrapMasterKey(masterHex, wrapKeyWA, wrapIvHex);

      await SecureStore.setItemAsync(storage.SECUREKEY_WRAPPED, JSON.stringify({ wrapped, wrapIvHex }));
      await SecureStore.setItemAsync(storage.SECUREKEY_SALT, saltHex);
      await SecureStore.setItemAsync(storage.SECUREKEY_ITER, PBKDF2_ITERATIONS.toString());
      await SecureStore.setItemAsync(storage.SECUREKEY_CREATED, new Date().toISOString());

      await storage.saveEntries([]);
      await storage.saveTamperLog([]); // changed from AsyncStorage to storage api
      await storage.saveMeta({ biometricEnabled: false });

      await storage.appendTamperLog({ ts: new Date().toISOString(), event: "vault_created" });

      setInitialized(true);
      setLocked(true);
      Alert.alert("Vault created", "Vault initialized. Remember your passphrase.");
    } catch (e: any) {
      console.error("Error creating vault:", e);
      Alert.alert("Error", "Failed to initialize vault. " + (e.message || ""));
    } finally {
      setLoading(false);
      setSetupPassA("");
      setSetupPassB("");
      refreshData();
    }
  }

  /* ---------------------------
     Unlock
  --------------------------- */
  async function handleUnlock() {
    setLoading(true);
    try {
      const wrappedObjStr = await SecureStore.getItemAsync(storage.SECUREKEY_WRAPPED);
      const saltHex = await SecureStore.getItemAsync(storage.SECUREKEY_SALT);
      const iterStr = await SecureStore.getItemAsync(storage.SECUREKEY_ITER);
      if (!wrappedObjStr || !saltHex || !iterStr) {
        Alert.alert("Vault not initialized", "No vault data found.");
        setLoading(false);
        return;
      }
      const iter = parseInt(iterStr, 10);
      const wrappedObj = JSON.parse(wrappedObjStr);
      const { wrapped, wrapIvHex } = wrappedObj;

      const metaJson = await storage.storageGetMeta();
      const meta = metaJson ? metaJson : { biometricEnabled: false };
      setVaultMeta(meta);

      if (meta.biometricEnabled) {
        const has = await LocalAuthentication.hasHardwareAsync();
        if (has) {
          const res = await LocalAuthentication.authenticateAsync({ promptMessage: "Vault biometric" });
          if (!res.success) {
            Alert.alert("Biometric failed", "Biometric authentication failed.");
            setLoading(false);
            return;
          }
        }
      }

      const wrapKeyWA = crypto.deriveKeyPBKDF2(unlockPass, saltHex, iter);
      let masterHex: string;
      try {
        masterHex = crypto.unwrapMasterKey(wrapped, wrapKeyWA, wrapIvHex);
        if (!masterHex || masterHex.length !== 64) throw new Error("Master key length mismatch");
      } catch (e) {
        await storage.appendTamperLog({ ts: new Date().toISOString(), event: "unlock_failed", detail: "wrong_passphrase" });
        Alert.alert("Unlock failed", "Incorrect passphrase.");
        setLoading(false);
        setUnlockPass("");
        return;
      }

      setMasterKeyHex(masterHex);
      setLocked(false);
      setUnlockPass("");
      await refreshData();
      await verifyIntegrity(masterHex);
      await storage.appendTamperLog({ ts: new Date().toISOString(), event: "unlocked", detail: "success" });
    } catch (e: any) {
      console.error("Unlock error", e);
      Alert.alert("Error", "Failed to unlock vault. " + (e.message || ""));
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------
     Lock
  --------------------------- */
  async function handleLock() {
    setMasterKeyHex(null);
    setLocked(true);
    setViewingEntryPlain(null);
    setNewEntryText("");
    await storage.appendTamperLog({ ts: new Date().toISOString(), event: "locked", detail: "user_lock" });
  }

  /* ---------------------------
     Verify integrity
  --------------------------- */
  async function verifyIntegrity(masterHexParam?: string) {
    const masterHex = masterHexParam || masterKeyHex;
    if (!masterHex) {
      setIntegrityStatus("Unknown");
      return;
    }
    try {
      const loaded = await storage.loadEntries();
      let okCount = 0,
        failCount = 0;
      for (const e of loaded) {
        const ok = crypto.verifyEntryHMAC(masterHex, e);
        if (ok) okCount++;
        else failCount++;
      }
      const status = failCount === 0 ? "Verified" : "Fail";
      setIntegrityStatus(status);
      const now = new Date().toISOString();
      setLastVerifiedAt(now);
      await storage.appendTamperLog({ ts: now, event: "integrity_check", detail: `${okCount} ok, ${failCount} fail` });
      refreshData();
    } catch (err) {
      console.warn("Integrity check error", err);
      setIntegrityStatus("Fail");
    }
  }

  /* ---------------------------
     Save new entry
  --------------------------- */
  async function handleSaveNewEntry() {
    if (!masterKeyHex) {
      Alert.alert("Locked", "Unlock first.");
      return;
    }
    if (!newEntryText || !newEntryText.trim()) {
      Alert.alert("Empty", "Entry empty.");
      return;
    }
    setLoading(true);
    try {
      const { ivHex, ciphertextB64, hmac, ts } = await crypto.encryptEntryWithMaster(masterKeyHex, newEntryText);
      const id = Date.now().toString() + "-" + ivHex.slice(0, 6);
      const entry: Entry = { id, iv: ivHex, ciphertext: ciphertextB64, hmac, timestamp: ts };
      await storage.appendEntry(entry);
      await storage.appendTamperLog({ ts: new Date().toISOString(), event: "entry_added", id });
      setNewEntryText("");
      setShowNewModal(false);
      refreshData();
    } catch (e: any) {
      console.error("Save entry error", e);
      Alert.alert("Error", "Failed to save entry. " + (e.message || ""));
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------
     View entry
  --------------------------- */
  async function handleViewEntry(entry: Entry) {
    if (!masterKeyHex) {
      Alert.alert("Locked", "Unlock first.");
      return;
    }
    const ok = crypto.verifyEntryHMAC(masterKeyHex, entry);
    if (!ok) {
      Alert.alert("Integrity failed", "Entry integrity check failed.");
      await storage.appendTamperLog({ ts: new Date().toISOString(), event: "entry_integrity_fail", id: entry.id });
      return;
    }
    try {
      const plain = crypto.decryptEntryWithMaster(masterKeyHex, entry);
      setViewingEntryPlain({ id: entry.id, text: plain });
      await storage.appendTamperLog({ ts: new Date().toISOString(), event: "entry_viewed", id: entry.id });
    } catch (e) {
      console.error("Decrypt error", e);
      Alert.alert("Error", "Decryption failed.");
    }
  }

  /* ---------------------------
     Panic wipe
  --------------------------- */
  async function performPanicWipe() {
    setLoading(true);
    try {
      const current = await storage.loadEntries();
      const passes = 3;
      for (let p = 0; p < passes; p++) {
        const junk: Entry[] = [];
        for (const e of current) {
          const len = Math.max(32, Math.floor(Math.random() * 128));
          const junkHex = await crypto.randomHex(len);
          junk.push({
            ...e,
            ciphertext: junkHex,
            hmac: junkHex,
            iv: junkHex.slice(0, 32),
            timestamp: new Date().toISOString(),
          });
        }
        await storage.saveEntries(junk);
        await new Promise((r) => setTimeout(r, 150));
      }

      await storage.clearAllVaultStorage();

      // confirm removal
      const checkWrapped = await SecureStore.getItemAsync(storage.SECUREKEY_WRAPPED);
      const checkEntries = await storage.loadEntries();
      if (checkWrapped !== null || (checkEntries && checkEntries.length > 0)) {
        console.warn("Panic wipe incomplete", { checkWrapped, entriesLen: checkEntries.length });
      }
      setEntries([]);
      setTamperLog([]);
      setMasterKeyHex(null);
      setLocked(true);
      setInitialized(false);
      Alert.alert("Panic wipe complete", "All vault data removed.");
    } catch (e: any) {
      console.error("Panic wipe failed", e);
      Alert.alert("Error", "Panic wipe failed. " + (e.message || ""));
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------
     UI: render
  --------------------------- */

  if (loading || initialized === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#44ffb0" />
          <Text style={styles.smallMuted}>Booting Secure Vault...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!initialized) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>VAULT_0xARN∆B</Text>
          <Text style={styles.subtitle}>Secure Offline Journal — Setup</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>Create master passphrase</Text>
          <TextInput
            secureTextEntry
            placeholder="Enter passphrase"
            placeholderTextColor="#3a6757"
            value={setupPassA}
            onChangeText={setSetupPassA}
            style={styles.input}
          />
          <Text style={styles.label}>Confirm passphrase</Text>
          <TextInput
            secureTextEntry
            placeholder="Confirm passphrase"
            placeholderTextColor="#3a6757"
            value={setupPassB}
            onChangeText={setSetupPassB}
            style={styles.input}
          />
          <Text style={styles.note}>Use a strong passphrase (recommended 12+ characters). No recovery is possible without it.</Text>
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleCreateVault}>
            <Text style={styles.buttonText}>Initialize Vault</Text>
          </TouchableOpacity>
        </ScrollView>
        <View style={styles.footer}>
          <Text style={styles.smallMuted}>This app stores encrypted data locally. Security depends on passphrase and device integrity.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (locked) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>VAULT_0xARN∆B</Text>
          <Text style={styles.subtitle}>Secure Offline Journal</Text>
        </View>

        <View style={styles.centered}>
          <Text style={styles.smallMuted}>
            Vault status: <Text style={{ color: "#ff9b9b" }}>Locked</Text>
          </Text>
          <Text style={styles.smallMuted}>Integrity: {integrityStatus}</Text>
          <Text style={styles.smallMuted}>Offline: Yes</Text>

          <TextInput
            placeholder="Enter passphrase"
            placeholderTextColor="#3a6757"
            secureTextEntry
            value={unlockPass}
            onChangeText={setUnlockPass}
            style={[styles.input, { marginTop: 20, width: "90%" }]}
          />

          <TouchableOpacity style={styles.buttonPrimary} onPress={handleUnlock}>
            <Text style={styles.buttonText}>Unlock Vault</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonSecondary, { marginTop: 12 }]}
            onPress={async () => {
              const has = await LocalAuthentication.hasHardwareAsync();
              if (!has) {
                Alert.alert("Unavailable", "Biometric unavailable.");
                return;
              }
              const res = await LocalAuthentication.authenticateAsync({ promptMessage: "Biometric Vault Unlock" });
              if (res.success) Alert.alert("Biometric OK", "Now enter passphrase to finish unlock.");
              else Alert.alert("Biometric failed", "Cancelled.");
            }}
          >
            <Text style={styles.buttonText}>Use Biometric (requires passphrase)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkButton]}
            onPress={() => Alert.alert("Security reminder", "AES-256 & HMAC-SHA256. Device compromise still defeats protection.")}
          >
            <Text style={styles.linkText}>Security Details</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Unlocked view
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>VAULT_0xARN∆B</Text>
          <Text style={styles.subtitle}>Secure Offline Journal</Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.smallMuted}>
            Vault: <Text style={{ color: "#8cffb7" }}>Unlocked</Text>
          </Text>
          <Text style={styles.smallMuted}>Integrity: {integrityStatus}</Text>
          <Text style={styles.smallMuted}>Entries: {entries.length}</Text>

          <TouchableOpacity style={styles.smallAction} onPress={handleLock}>
            <Text style={styles.smallActionText}>Lock Vault</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.colLeft}>
          <TouchableOpacity style={styles.buttonPrimary} onPress={() => setShowNewModal(true)}>
            <Text style={styles.buttonText}>New Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonSecondary} onPress={() => setShowAudit(true)}>
            <Text style={styles.buttonText}>Audit / Verify</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonSecondary, { backgroundColor: "#2a2a2a", borderColor: "#444" }]}
            onPress={() => setShowPanicConfirm(true)}
          >
            <Text style={styles.buttonText}>Panic Wipe</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 18 }}>
            <Text style={styles.smallMuted}>Last verified: {lastVerifiedAt || "never"}</Text>
            <Text style={styles.smallMuted}>Tamper log ({tamperLog.length})</Text>
            <ScrollView style={{ maxHeight: 120, marginTop: 6 }}>
              {tamperLog.slice(0, 10).map((log, idx) => (
                <Text key={idx} style={styles.logLine}>
                  {log.ts} — {log.event}
                  {log.detail ? `: ${log.detail}` : ""}
                </Text>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.colRight}>
          <Text style={styles.sectionTitle}>Entries (append-only)</Text>
          {entries.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.smallMuted}>No entries yet.</Text>
            </View>
          ) : (
            <FlatList
              data={entries}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <EntryCard item={item} onView={handleViewEntry} />}
            />
          )}
        </View>
      </View>

      {/* New Entry Modal */}
      <Modal visible={showNewModal} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Secure Entry</Text>
            <TextInput
              multiline
              value={newEntryText}
              onChangeText={setNewEntryText}
              placeholder="Write your entry"
              placeholderTextColor="#4f6c5a"
              style={[styles.input, { height: 140 }]}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.buttonSecondary, { flex: 1, marginRight: 8 }]}
                onPress={() => {
                  setShowNewModal(false);
                  setNewEntryText("");
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.buttonPrimary, { flex: 1 }]} onPress={handleSaveNewEntry}>
                <Text style={styles.buttonText}>Encrypt & Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Entry Modal */}
      <Modal visible={!!viewingEntryPlain} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Decrypted Entry</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              <Text style={styles.plainText}>{viewingEntryPlain?.text}</Text>
            </ScrollView>
            <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 12 }]} onPress={() => setViewingEntryPlain(null)}>
              <Text style={styles.buttonText}>Close (clear from memory)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Audit Modal */}
      <AuditModal
        visible={showAudit}
        onClose={() => setShowAudit(false)}
        meta={{ pbkdf2Iterations: PBKDF2_ITERATIONS }}
        tamperLog={tamperLog}
        lastVerifiedAt={lastVerifiedAt}
      />

      {/* Panic Modal */}
      <PanicModal
        visible={showPanicConfirm}
        onCancel={() => {
          setShowPanicConfirm(false);
          setPanicConfirmText("");
        }}
        onConfirm={async () => {
          setShowPanicConfirm(false);
          setPanicConfirmText("");
          await performPanicWipe();
        }}
        confirmText={panicConfirmText}
        setConfirmText={setPanicConfirmText}
      />

      <View style={styles.footer}>
        <Text style={styles.smallMuted}>Offline. Security depends on passphrase and device integrity.</Text>
      </View>
    </SafeAreaView>
  );
}
