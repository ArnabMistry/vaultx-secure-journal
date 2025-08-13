// src/storage.js
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
 // Assuming you have a storage.js file for async operations


export const SECUREKEY_WRAPPED = "vault_wrapped_key";
export const SECUREKEY_SALT = "vault_salt";
export const SECUREKEY_ITER = "vault_iter";
export const SECUREKEY_CREATED = "vault_created";
export const ASYNC_ENTRIES_KEY = "vault_entries";
export const ASYNC_TAMPERLOG_KEY = "vault_tamper_log";
export const ASYNC_META_KEY = "vault_meta";

/* AsyncStorage helpers for entries/tamper log */
export async function loadEntries() {
  try {
    const json = await AsyncStorage.getItem(ASYNC_ENTRIES_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.warn("loadEntries error", e);
    return [];
  }
}

export async function saveEntries(entries) {
  try {
    await AsyncStorage.setItem(ASYNC_ENTRIES_KEY, JSON.stringify(entries));
    return true;
  } catch (e) {
    console.warn("saveEntries error", e);
    return false;
  }
}

export async function appendEntry(entry) {
  const entries = await loadEntries();
  entries.unshift(entry);
  await saveEntries(entries);
}

export async function getEntry(id) {
  try {
    const entries = await loadEntries();
    return entries.find(entry => entry.id === id) || null;
  } catch (e) {
    console.warn("getEntry error", e);
    return null;
  }
}

export async function updateEntry(id, updatedEntry) {
  try {
    const entries = await loadEntries();
    const index = entries.findIndex(entry => entry.id === id);
    if (index !== -1) {
      entries[index] = { ...entries[index], ...updatedEntry };
      await saveEntries(entries);
    }
  } catch (error) {
    console.error("updateEntry error", error);
  }
}

export async function clearAllEntries() {
  try {
    await AsyncStorage.removeItem(ASYNC_ENTRIES_KEY);
  } catch (error) {
    console.error("clearAllEntries error", error);
  }
}

export async function loadTamperLog() {
  try {
    const json = await AsyncStorage.getItem(ASYNC_TAMPERLOG_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    return [];
  }
}

export async function appendTamperLog(eventObj) {
  const log = await loadTamperLog();
  log.unshift(eventObj);
  try {
    await AsyncStorage.setItem(ASYNC_TAMPERLOG_KEY, JSON.stringify(log));
  } catch (e) {
    console.warn("appendTamperLog error", e);
  }
}

// storage.js

export async function storageGetMeta(key) {
    try {
      const value = await AsyncStorage.getItem(key + "_meta");
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error("Error getting meta:", error);
      return null;
    }
  }
  
  export async function saveTamperLog(logData) {
    try {
      const existingLogs = await AsyncStorage.getItem("tamperLogs");
      let logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push({ ...logData, timestamp: Date.now() });
      await AsyncStorage.setItem("tamperLogs", JSON.stringify(logs));
    } catch (error) {
      console.error("Error saving tamper log:", error);
    }
  }
  
export async function clearAllVaultStorage() {
  // Remove async keys and secure keys
  await AsyncStorage.removeItem(ASYNC_ENTRIES_KEY);
  await AsyncStorage.removeItem(ASYNC_TAMPERLOG_KEY);
  await AsyncStorage.removeItem(ASYNC_META_KEY);

  await SecureStore.deleteItemAsync(SECUREKEY_WRAPPED);
  await SecureStore.deleteItemAsync(SECUREKEY_SALT);
  await SecureStore.deleteItemAsync(SECUREKEY_ITER);
  await SecureStore.deleteItemAsync(SECUREKEY_CREATED);
}
