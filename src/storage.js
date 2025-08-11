// src/storage.js
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
