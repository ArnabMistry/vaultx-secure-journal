// src/crypto.js
import * as ExpoCrypto from "expo-crypto";
import CryptoJS from "crypto-js";

/**
 * bytesToHex - convert Uint8Array => hex string
 */
export function bytesToHex(bytes) {
  return Array.from(bytes).map(b => ("00" + b.toString(16)).slice(-2)).join("");
}

/**
 * randomHex - request secure random bytes from expo-crypto.
 * returns hex string of length bytes * 2.
 */
export async function randomHex(bytes) {
  // expo-crypto returns Uint8Array in modern runtimes
  const arr = await ExpoCrypto.getRandomBytesAsync(bytes);
  if (!(arr instanceof Uint8Array)) {
    // fallback: if expo returned base64 (older) decode - try safe fallback
    // but in modern SDK you should get Uint8Array
    const b64 = String(arr);
    const raw = atob(b64);
    const u8 = new Uint8Array(raw.split("").map(c => c.charCodeAt(0)));
    return bytesToHex(u8);
  }
  return bytesToHex(arr);
}

/**
 * hex <-> CryptoJS WordArray helpers
 */
export function hexToWordArray(hex) {
  return CryptoJS.enc.Hex.parse(hex);
}
export function wordArrayToHex(wordArray) {
  return wordArray.toString(CryptoJS.enc.Hex);
}

/**
 * deriveKeyPBKDF2 - returns CryptoJS WordArray derived key
 * - passphrase: string
 * - saltHex: hex string
 */
export function deriveKeyPBKDF2(passphrase, saltHex, iterations = 100000, keyWords = 256 / 32) {
  const saltWA = hexToWordArray(saltHex);
  return CryptoJS.PBKDF2(passphrase, saltWA, {
    keySize: keyWords,
    iterations,
    hasher: CryptoJS.algo.SHA256
  });
}

/**
 * wrapMasterKey / unwrapMasterKey
 * - masterKeyHex is hex representation
 * - wrapKeyWA is CryptoJS WordArray
 * - wrapIvHex is hex iv
 */
export function wrapMasterKey(masterKeyHex, wrapKeyWA, wrapIvHex) {
  const ivWA = hexToWordArray(wrapIvHex);
  const plaintextWA = hexToWordArray(masterKeyHex);
  const wrapped = CryptoJS.AES.encrypt(plaintextWA, wrapKeyWA, {
    iv: ivWA,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return wrapped.toString(); // base64
}

export function unwrapMasterKey(wrappedBase64, wrapKeyWA, wrapIvHex) {
  const ivWA = hexToWordArray(wrapIvHex);
  const decryptedWA = CryptoJS.AES.decrypt(wrappedBase64, wrapKeyWA, {
    iv: ivWA,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return decryptedWA.toString(CryptoJS.enc.Hex);
}

/**
 * encryptEntryWithMaster / decryptEntryWithMaster
 * - masterKeyHex: hex string
 */
export async function encryptEntryWithMaster(masterKeyHex, plaintext) {
  // generate IV securely
  const ivHex = await randomHex(16);
  const keyWA = hexToWordArray(masterKeyHex);
  const ivWA = hexToWordArray(ivHex);

  const cipherParams = CryptoJS.AES.encrypt(plaintext, keyWA, {
    iv: ivWA,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  const ciphertextB64 = cipherParams.toString();

  // HMAC key derived from master (not for secrecy but for integrity)
  const hmacKeyWA = CryptoJS.SHA256(hexToWordArray(masterKeyHex));
  const ts = new Date().toISOString();
  const hmacInput = ivHex + "|" + ciphertextB64 + "|" + ts;
  const hmac = CryptoJS.HmacSHA256(hmacInput, hmacKeyWA).toString(CryptoJS.enc.Hex);

  return { ivHex, ciphertextB64, hmac, ts };
}

export function verifyEntryHMAC(masterKeyHex, entry) {
  try {
    const hmacKeyWA = CryptoJS.SHA256(hexToWordArray(masterKeyHex));
    const hmacInput = entry.iv + "|" + entry.ciphertext + "|" + entry.timestamp;
    const recomputed = CryptoJS.HmacSHA256(hmacInput, hmacKeyWA).toString(CryptoJS.enc.Hex);
    return recomputed === entry.hmac;
  } catch (e) {
    return false;
  }
}

export function decryptEntryWithMaster(masterKeyHex, entry) {
  const keyWA = hexToWordArray(masterKeyHex);
  const ivWA = hexToWordArray(entry.iv);
  const decryptedWA = CryptoJS.AES.decrypt(entry.ciphertext, keyWA, {
    iv: ivWA,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return decryptedWA.toString(CryptoJS.enc.Utf8);
}

/**
 * shortHex - helper for display
 */
export function shortHex(hex, len = 8) {
  return hex ? hex.slice(0, len) : "";
}
