// app/index.tsx
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

import AsyncStorage from "@react-native-async-storage/async-storage";
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

// DEV unlock for testing purposes

// Minimal TS types (storage.js & crypto.js are JS files you said you already have)
type VaultMeta = { biometricEnabled: boolean };
type Entry = {
  id: string;
  iv: string;
  ciphertext: string;
  hmac: string;
  timestamp: string;
  [k: string]: any;
};
type TamperLogItem = { ts: string; event: string; detail?: string; id?: string };

export default function App(): JSX.Element {
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [locked, setLocked] = useState<boolean>(true);
  const [masterKeyHex, setMasterKeyHex] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tamperLog, setTamperLog] = useState<TamperLogItem[]>([]);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string | null>(null);
  const [vaultMeta, setVaultMeta] = useState<VaultMeta>({ biometricEnabled: false });

  const [setupPassA, setSetupPassA] = useState<string>("");
  const [setupPassB, setSetupPassB] = useState<string>("");
  const [unlockPass, setUnlockPass] = useState<string>("");
  const [newEntryText, setNewEntryText] = useState<string>("");
  const [viewingEntryPlain, setViewingEntryPlain] = useState<{ id: string; text: string } | null>(null);
  const [showNewModal, setShowNewModal] = useState<boolean>(false);
  const [showAudit, setShowAudit] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [integrityStatus, setIntegrityStatus] = useState<string>("Unknown");
  const [showPanicConfirm, setShowPanicConfirm] = useState<boolean>(false);
  const [panicConfirmText, setPanicConfirmText] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const wrapped = await SecureStore.getItemAsync((storage as any).SECUREKEY_WRAPPED);
        const salt = await SecureStore.getItemAsync((storage as any).SECUREKEY_SALT);
        const iter = await SecureStore.getItemAsync((storage as any).SECUREKEY_ITER);
        const metaJson = await (storage as any).storageGetMeta?.();
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

  // dev toggle (safe shortcut visible only in development)
const DEV_UNLOCK_ENABLED = __DEV__;

// quick dev unlock (keeps a dummy 64-char hex so length checks pass)
async function handleDevUnlock(): Promise<void> {
  //console.log("🔓 Dev unlock pressed");
  // fake master key (64 hex chars) so code expecting masterKeyHex length won't immediately fail
  const fakeMaster = "f".repeat(64);
  setMasterKeyHex(fakeMaster);
  setLocked(false);
  setIntegrityStatus("Dev");
  await refreshData();
  try {
    await (storage as any).appendTamperLog({ ts: new Date().toISOString(), event: "dev_unlocked" });
  } catch (e) {
    // ignore storage errors in dev helper
    console.warn("dev unlock log failed", e);
  }
}
//dev unlock end
  
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
        } catch (e) {
          
        }
      }
    })();
  }, [locked]);

  async function refreshData(): Promise<void> {
    const e = await (storage as any).loadEntries();
    setEntries(e || []);
    const t = await (storage as any).loadTamperLog();
    setTamperLog(t || []);
  }

  /* ---------------------------
     Setup: create vault
  --------------------------- */
  async function handleCreateVault(): Promise<void> {
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
      const masterHex = await (crypto as any).randomHex(32);
      const saltHex = await (crypto as any).randomHex(16);
      const wrapIvHex = await (crypto as any).randomHex(16);

      const wrapKeyWA = (crypto as any).deriveKeyPBKDF2(setupPassA, saltHex, PBKDF2_ITERATIONS);

      const wrapped = (crypto as any).wrapMasterKey(masterHex, wrapKeyWA, wrapIvHex);

      await SecureStore.setItemAsync((storage as any).SECUREKEY_WRAPPED, JSON.stringify({ wrapped, wrapIvHex }));
      await SecureStore.setItemAsync((storage as any).SECUREKEY_SALT, saltHex);
      await SecureStore.setItemAsync((storage as any).SECUREKEY_ITER, PBKDF2_ITERATIONS.toString());
      await SecureStore.setItemAsync((storage as any).SECUREKEY_CREATED, new Date().toISOString());

      
      await (storage as any).saveEntries([]);
      await AsyncStorage.setItem((storage as any).ASYNC_TAMPERLOG_KEY, JSON.stringify([]));
      await AsyncStorage.setItem((storage as any).ASYNC_META_KEY, JSON.stringify({ biometricEnabled: false }));

      await (storage as any).appendTamperLog({ ts: new Date().toISOString(), event: "vault_created" });

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
  async function handleUnlock(): Promise<void> {
    setLoading(true);
    try {
      const wrappedObjStr = await SecureStore.getItemAsync((storage as any).SECUREKEY_WRAPPED);
      const saltHex = await SecureStore.getItemAsync((storage as any).SECUREKEY_SALT);
      const iterStr = await SecureStore.getItemAsync((storage as any).SECUREKEY_ITER);
      if (!wrappedObjStr || !saltHex || !iterStr) {
        Alert.alert("Vault not initialized", "No vault data found.");
        setLoading(false);
        return;
      }
      const iter = parseInt(iterStr, 10);
      const wrappedObj = JSON.parse(wrappedObjStr);
      const { wrapped, wrapIvHex } = wrappedObj;

      
      const metaJson = await AsyncStorage.getItem((storage as any).ASYNC_META_KEY);
      const meta = metaJson ? JSON.parse(metaJson) : { biometricEnabled: false };
      setVaultMeta(meta);
      if (meta.biometricEnabled) {
        const has = await LocalAuthentication.hasHardwareAsync();
        if (has) {
          const res = await LocalAuthentication.authenticateAsync({ promptMessage: "Vault biometric" });
          if (!res.success) {
            Alert.alert("Biometric failed", "Biometric authentication failed.");
            await (storage as any).appendTamperLog({ ts: new Date().toISOString(), event: "unlock_failed", detail: "biometric_failed" });
            setLoading(false);
            return;
          }
        }
      }

      const wrapKeyWA = (crypto as any).deriveKeyPBKDF2(unlockPass, saltHex, iter);
      let masterHex: string;
      try {
        masterHex = (crypto as any).unwrapMasterKey(wrapped, wrapKeyWA, wrapIvHex);
        if (!masterHex || masterHex.length !== 64) throw new Error("Master key length mismatch");
      } catch (e) {
        await (storage as any).appendTamperLog({ ts: new Date().toISOString(), event: "unlock_failed", detail: "wrong_passphrase" });
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
      await (storage as any).appendTamperLog({ ts: new Date().toISOString(), event: "unlocked", detail: "success" });
    } catch (e: any) {
      console.error("Unlock error", e);
      Alert.alert("Error", "Failed to unlock vault. " + (e.message || ""));
      await (storage as any).appendTamperLog({ ts: new Date().toISOString(), event: "unlock_failed", detail: e.message || "unknown" });
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------
     Lock
  --------------------------- */
  async function handleLock(): Promise<void> {
    setMasterKeyHex(null);
    setLocked(true);
    setViewingEntryPlain(null);
    setNewEntryText("");
    await (storage as any).appendTamperLog({ ts: new Date().toISOString(), event: "locked", detail: "user_lock" });
  }
  /* ---------------------------
     One-click verify wrapper (UI-friendly)
  --------------------------- */
async function handleVerifyNow(): Promise<void> {
  if (!masterKeyHex) {
    Alert.alert("Locked", "Unlock the vault to run integrity verification.");
    return;
  }

  try {
    setLoading(true);
    // run the existing verify function (it updates integrityStatus + tamper log)
    await verifyIntegrity(masterKeyHex);
    // small feedback — the status is visible in the header, so no heavy alert needed.
    await (storage as any).appendTamperLog({ ts: new Date().toISOString(), event: "manual_integrity_check" });
  } catch (e: any) {
    console.warn("Manual verify failed", e);
    Alert.alert("Verify failed", e?.message || "Unknown error");
  } finally {
    setLoading(false);
  }
}


  /* ---------------------------
     Verify integrity
  --------------------------- */
  async function verifyIntegrity(masterHexParam?: string): Promise<void> {
    const masterHex = masterHexParam || masterKeyHex;
    if (!masterHex) {
      setIntegrityStatus("Unknown");
      return;
    }
    try {
      const loaded: Entry[] = await (storage as any).loadEntries();
      let okCount = 0,
        failCount = 0;
      for (const e of loaded || []) {
        const ok = (crypto as any).verifyEntryHMAC(masterHex, e);
        if (ok) okCount++;
        else failCount++;
      }
      const status = failCount === 0 ? "Verified" : "Fail";
      setIntegrityStatus(status);
      const now = new Date().toISOString();
      setLastVerifiedAt(now);
      await (storage as any).appendTamperLog({ ts: now, event: "integrity_check", detail: `${okCount} ok, ${failCount} fail` });
      refreshData();
    } catch (err) {
      console.warn("Integrity check error", err);
      setIntegrityStatus("Fail");
    }
  }

  /* ---------------------------
     Save new entry
  --------------------------- */
  async function handleSaveNewEntry(): Promise<void> {
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
      const { ivHex, ciphertextB64, hmac, ts } = await (crypto as any).encryptEntryWithMaster(masterKeyHex, newEntryText);
      const id = Date.now().toString() + "-" + ivHex.slice(0, 6);
      const entry: Entry = { id, iv: ivHex, ciphertext: ciphertextB64, hmac, timestamp: ts };
      await (storage as any).appendEntry(entry);
      await (storage as any).appendTamperLog({ ts: new Date().toISOString(), event: "entry_added", id });
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
  async function handleViewEntry(entry: Entry): Promise<void> {
    if (!masterKeyHex) {
      Alert.alert("Locked", "Unlock first.");
      return;
    }
    const ok = (crypto as any).verifyEntryHMAC(masterKeyHex, entry);
    if (!ok) {
      Alert.alert("Integrity failed", "Entry integrity check failed.");
      await (storage as any).appendTamperLog({ ts: new Date().toISOString(), event: "entry_integrity_fail", id: entry.id });
      return;
    }
    try {
      const plain = (crypto as any).decryptEntryWithMaster(masterKeyHex, entry);
      setViewingEntryPlain({ id: entry.id, text: plain });
      await (storage as any).appendTamperLog({ ts: new Date().toISOString(), event: "entry_viewed", id: entry.id });
    } catch (e) {
      console.error("Decrypt error", e);
      Alert.alert("Error", "Decryption failed.");
      await (storage as any).appendTamperLog({ ts: new Date().toISOString(), event: "entry_decrypt_fail", id: entry.id});
    }
  }

  /* ---------------------------
     Panic wipe
     - do multiple overwrite passes
     - delete SecureStore keys
     - verify deletion
  --------------------------- */
  async function performPanicWipe(): Promise<void> {
    setLoading(true);
    try {
      const current: Entry[] = await (storage as any).loadEntries();
      const passes = 3;
      for (let p = 0; p < passes; p++) {
        const junk: Entry[] = [];
        for (const e of current || []) {
          const len = Math.max(32, Math.floor(Math.random() * 128));
          const junkHex = await (crypto as any).randomHex(len);
          junk.push({ ...e, ciphertext: junkHex, hmac: junkHex, iv: junkHex.slice(0, 32), timestamp: new Date().toISOString() });
        }
        await (storage as any).saveEntries(junk);
        await new Promise((r) => setTimeout(r, 150));
      }

      await (storage as any).clearAllEntries();

    
      const checkWrapped = await SecureStore.getItemAsync((storage as any).SECUREKEY_WRAPPED);
      const checkEntries = await (storage as any).loadEntries();
      if (checkWrapped !== null || (checkEntries && checkEntries.length > 0)) {
        console.warn("Panic wipe incomplete", { checkWrapped, entriesLen: checkEntries.length });
        
        await (storage as any).appendTamperLog({ ts: new Date().toISOString(), event: "panic_wipe_failed", detail: "Data still exists after wipe" });

      }
      setEntries([]);
      
    setMasterKeyHex(null);
    setLocked(true);
    setInitialized(false);
      Alert.alert("Panic wipe complete", "All vault data removed.");
      await (storage as any).appendTamperLog({ ts: new Date().toISOString(), event: "panic_wiped" });
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
          <TextInput secureTextEntry placeholder="Enter passphrase" placeholderTextColor="#3a6757" value={setupPassA} onChangeText={setSetupPassA} style={styles.input} />
          <Text style={styles.label}>Confirm passphrase</Text>
          <TextInput secureTextEntry placeholder="Confirm passphrase" placeholderTextColor="#3a6757" value={setupPassB} onChangeText={setSetupPassB} style={styles.input} />
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
          <Text style={styles.smallMuted}>Vault status: <Text style={{ color: "#ff9b9b" }}>Locked</Text></Text>
          <Text style={styles.smallMuted}>Integrity: {integrityStatus}</Text>
          <Text style={styles.smallMuted}>Offline: Yes</Text>

          <TextInput placeholder="Enter passphrase" placeholderTextColor="#3a6757" secureTextEntry value={unlockPass} onChangeText={setUnlockPass} style={[styles.input, { marginTop: 20, width: "90%" }]} />

          <TouchableOpacity style={styles.buttonPrimary} onPress={handleUnlock}>
            <Text style={styles.buttonText}>Unlock Vault</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.buttonSecondary, { marginTop: 12 }]} onPress={async () => {
            const has = await LocalAuthentication.hasHardwareAsync();
            if (!has) { Alert.alert("Unavailable", "Biometric unavailable."); return; }
            const res = await LocalAuthentication.authenticateAsync({ promptMessage: "Biometric Vault Unlock" });
            if (res.success) Alert.alert("Biometric OK", "Now enter passphrase to finish unlock.");
            else Alert.alert("Biometric failed", "Cancelled.");
          }}>
            <Text style={styles.buttonText}>Use Biometric (requires passphrase)</Text>
          </TouchableOpacity>
          {DEV_UNLOCK_ENABLED && (
<TouchableOpacity
    style={[styles.buttonSecondary, { marginTop: 12 }]}
    onPress={handleDevUnlock}
  >
    <Text style={styles.buttonText}>Skip Unlock (Dev)</Text>
  </TouchableOpacity>
)}

          <TouchableOpacity style={[styles.linkButton]} onPress={() => Alert.alert("Security reminder", "AES-256 & HMAC-SHA256. Device compromise still defeats protection.")}>
            <Text style={styles.linkText}>Security Details</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>VAULT_0xARN∆B</Text>
          <Text style={styles.subtitle}>Secure Offline Journal</Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.smallMuted}>Vault: <Text style={{ color: "#8cffb7" }}>Unlocked</Text></Text>
          <Text style={styles.smallMuted}>Integrity: {integrityStatus}</Text>
          <Text style={styles.smallMuted}>Entries: {entries.length}</Text>

          <TouchableOpacity style={styles.smallAction} onPress={handleLock}>
            <Text style={styles.smallActionText}>Lock Vault</Text>
          </TouchableOpacity>
          {/* Add this next to the Lock Vault button (header right column) */}
{/* <TouchableOpacity
  style={[styles.smallAction, { marginTop: 6, marginBottom: 2 }]}
  onPress={handleVerifyNow}
  disabled={!masterKeyHex || loading}
>
  <Text style={styles.smallActionText}>Verify</Text>
</TouchableOpacity> */}

        </View>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.colLeft}>
          <TouchableOpacity style={styles.buttonPrimary} onPress={() => setShowNewModal(true)}>
            <Text style={styles.buttonText}>New Entry</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.buttonSecondary} onPress={() => setShowAudit(true)}>
            <Text style={styles.buttonText}>Audit Log</Text>
          </TouchableOpacity>

          <TouchableOpacity
  style={[styles.buttonSecondary, { marginTop: 12 }]}
  onPress={handleVerifyNow}
  disabled={!masterKeyHex || loading}
>
  <Text style={styles.buttonText}>HashVerify</Text>
</TouchableOpacity>


          <TouchableOpacity style={[styles.buttonSecondary, { backgroundColor: "#2a2a2a", borderColor: "#444" }]} onPress={() => setShowPanicConfirm(true)}>
            <Text style={styles.buttonText}>Panic Wipe</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 18 }}>
            <Text style={styles.smallMuted}>Last verified: {lastVerifiedAt || "never"}</Text>
            <Text style={styles.smallMuted}>Tamper log ({tamperLog.length})</Text>
            <ScrollView style={{ maxHeight: 300, marginTop: 6 }}>
              {tamperLog.slice(0, 10).map((log, idx) => (
                <Text key={idx} style={styles.logLine}>
                  {log.ts} — {log.event} {log.detail ? `: ${log.detail}` : ""}
                </Text>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.colRight}>
          <Text style={styles.sectionTitle}>Entries (append-only)</Text>
          {entries.length === 0 ? (
            <View style={styles.emptyBox}><Text style={styles.smallMuted}>Click on New Entry</Text></View>
          ) : (
            <FlatList data={entries} keyExtractor={(item) => item.id} renderItem={({ item }) => <EntryCard item={item} onView={handleViewEntry} />} />
          )}
        </View>
      </View>

      {/* New Entry Modal */}
      <Modal visible={showNewModal} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Secure Entry</Text>
            <TextInput multiline value={newEntryText} onChangeText={setNewEntryText} placeholder="Write your entry" placeholderTextColor="#4f6c5a" style={[styles.input, { height: 70 }]} />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
              <TouchableOpacity style={[styles.buttonSecondary, { flex: 1, marginRight: 8 }]} onPress={() => { setShowNewModal(false); setNewEntryText(""); }}>
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
      <AuditModal visible={showAudit} onClose={() => setShowAudit(false)} meta={{ pbkdf2Iterations: PBKDF2_ITERATIONS }} tamperLog={tamperLog} lastVerifiedAt={lastVerifiedAt} />

      {/* Panic Modal */}
      <PanicModal visible={showPanicConfirm} onCancel={() => { setShowPanicConfirm(false); setPanicConfirmText(""); }} onConfirm={async () => { setShowPanicConfirm(false); setPanicConfirmText(""); await performPanicWipe(); }} confirmText={panicConfirmText} setConfirmText={setPanicConfirmText} />

      <View style={styles.footer}><Text style={styles.smallMuted}>Offline. Security depends on passphrase and device integrity.</Text></View>
    </SafeAreaView>
  );
}
