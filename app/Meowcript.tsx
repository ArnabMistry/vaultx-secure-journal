// src/components/Meowcript.tsx
import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import CryptoJS from "crypto-js";

/**
 * Meowcript™ - single-file implementation
 *
 * Design goals:
 * - Whisker Masking = first obfuscation (XOR with "=^.^=")
 * - Purr Shift = deterministic per-char offset derived from passphrase hash
 * - Catnap Lock = AES-256 (via CryptoJS) with PBKDF2 key derivation, random salt + iv
 * - Claw Mark = SHA256(cipher + salt + iv + watermark)
 *
 * WARNING: This is a branded wrapper around proper crypto. The Cat-themed steps
 * provide uniqueness/branding, but the core protection relies on AES+PBKDF2.
 * Use strong passphrases and production key management for high-security needs.
 */

/* ---------- Utility helpers ---------- */

const WATERMARK = "=^.^= Meowcript™ v1.0";

function utf8ToWordArray(s: string) {
  return CryptoJS.enc.Utf8.parse(s);
}

function wordArrayToUtf8(wa: CryptoJS.lib.WordArray) {
  return CryptoJS.enc.Utf8.stringify(wa);
}

function randomWordArray(bytes = 16) {
  return CryptoJS.lib.WordArray.random(bytes);
}

/* Whisker Masking: XOR with repeating pattern */
function whiskerMask(text: string): string {
  const pattern = "=^.^=";
  const outChars: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const a = text.charCodeAt(i);
    const b = pattern.charCodeAt(i % pattern.length);
    outChars.push(a ^ b);
  }
  // convert to a string by using fromCharCode (binary may be non-printable)
  return String.fromCharCode(...outChars);
}

/* Purr Shift: add offsets derived from passphrase hash (reversible) */
function derivePurrOffsets(passphrase: string, len: number): number[] {
  // Use PBKDF2-ish derivation to produce deterministic bytes from passphrase
  const salt = CryptoJS.SHA256(passphrase + "_meow_salt").toString(CryptoJS.enc.Hex);
  // turn hex into bytes
  const bytes: number[] = [];
  for (let i = 0; i < salt.length; i += 2) {
    bytes.push(parseInt(salt.substr(i, 2), 16));
  }
  // produce offsets in [1..9] to avoid zero-shift
  const offsets = new Array(len).fill(0).map((_, i) => ((bytes[i % bytes.length] % 9) + 1));
  return offsets;
}

function purrShift(text: string, passphrase: string): string {
  const offsets = derivePurrOffsets(passphrase, text.length);
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    out.push((text.charCodeAt(i) + offsets[i]) & 0xff);
  }
  return String.fromCharCode(...out);
}

function purrUnshift(text: string, passphrase: string): string {
  const offsets = derivePurrOffsets(passphrase, text.length);
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    out.push((text.charCodeAt(i) - offsets[i] + 256) & 0xff);
  }
  return String.fromCharCode(...out);
}

/* Catnap Lock (AES-256 with PBKDF2-derived key)
   We return base64 ciphertext and include base64 salt + iv for decryption.
*/
type CatnapResult = {
  cipherBase64: string;
  saltBase64: string;
  ivBase64: string;
};

function catnapEncrypt(plaintext: string, passphrase: string): CatnapResult {
  // random salt (8 bytes) and iv (16 bytes)
  const salt = randomWordArray(8);
  const iv = randomWordArray(16);

  // derive key: PBKDF2 with iterations = 10000, keySize = 256/32
  const key = CryptoJS.PBKDF2(passphrase, salt, { keySize: 256 / 32, iterations: 10000 });

  const encrypted = CryptoJS.AES.encrypt(utf8ToWordArray(plaintext), key, { iv });
  return {
    cipherBase64: encrypted.toString(), // default is base64 string
    saltBase64: CryptoJS.enc.Base64.stringify(salt),
    ivBase64: CryptoJS.enc.Base64.stringify(iv),
  };
}

function catnapDecrypt(cipherBase64: string, passphrase: string, saltBase64: string, ivBase64: string): string | null {
  try {
    const salt = CryptoJS.enc.Base64.parse(saltBase64);
    const iv = CryptoJS.enc.Base64.parse(ivBase64);
    const key = CryptoJS.PBKDF2(passphrase, salt, { keySize: 256 / 32, iterations: 10000 });
    const decrypted = CryptoJS.AES.decrypt(cipherBase64, key, { iv });
    const plain = wordArrayToUtf8(decrypted);
    return plain;
  } catch (e) {
    return null;
  }
}

/* Claw Mark signature */
function clawMark(cipherBase64: string, saltBase64: string, ivBase64: string): string {
  const digest = CryptoJS.SHA256(cipherBase64 + "|" + saltBase64 + "|" + ivBase64 + "|" + WATERMARK);
  return digest.toString(CryptoJS.enc.Hex);
}

/* Public Meowcript APIs */
type MeowcriptResult = {
  watermark: string;
  cipher: string;      // base64 cipher
  salt: string;        // base64 salt
  iv: string;          // base64 iv
  claw: string;        // hex SHA256
};

export function meowEncrypt(plaintext: string, passphrase: string): MeowcriptResult {
  // Layer 1: Whisker Mask (XOR)
  const masked = whiskerMask(plaintext);

  // Layer 2: Purr Shift
  const shifted = purrShift(masked, passphrase);

  // Layer 3: Catnap Lock (AES)
  const { cipherBase64, saltBase64, ivBase64 } = catnapEncrypt(shifted, passphrase);

  // Claw mark
  const claw = clawMark(cipherBase64, saltBase64, ivBase64);

  return {
    watermark: WATERMARK,
    cipher: cipherBase64,
    salt: saltBase64,
    iv: ivBase64,
    claw,
  };
}

export function meowDecrypt(result: { cipher: string; salt: string; iv: string }, passphrase: string): { ok: boolean; plaintext?: string } {
  const { cipher, salt, iv } = result;
  // verify we can decrypt catnap
  const decryptedShifted = catnapDecrypt(cipher, passphrase, salt, iv);
  if (decryptedShifted === null) return { ok: false };

  // reverse purr shift
  const unshifted = purrUnshift(decryptedShifted, passphrase);

  // reverse whisker mask (XOR is symmetric)
  const original = whiskerMask(unshifted);

  return { ok: true, plaintext: original };
}

/* ---------- React UI Component ---------- */

export default function MeowcriptPage() {
  const [plain, setPlain] = React.useState("");
  const [pass, setPass] = React.useState("");
  const [out, setOut] = React.useState<MeowcriptResult | null>(null);
  const [lastDecrypted, setLastDecrypted] = React.useState<string | null>(null);

  const handleEncrypt = () => {
    if (!plain || !pass) {
      Alert.alert("Meowcript", "Please provide plaintext and passphrase.");
      return;
    }
    try {
      const result = meowEncrypt(plain, pass);
      setOut(result);
      setLastDecrypted(null);
    } catch (e) {
      Alert.alert("Meowcript", "Encryption failed.");
    }
  };

  const handleDecrypt = () => {
    if (!out) {
      Alert.alert("Meowcript", "No ciphertext available to decrypt.");
      return;
    }
    if (!pass) {
      Alert.alert("Meowcript", "Enter the passphrase used for encryption.");
      return;
    }
    const { ok, plaintext } = meowDecrypt({ cipher: out.cipher, salt: out.salt, iv: out.iv }, pass);
    if (!ok) {
      Alert.alert("Meowcript", "Decryption failed. Check passphrase.");
      return;
    }
    setLastDecrypted(plaintext || null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      // react-native clipboard API depends on your RN version
      // simple fallback: prompt user with an alert showing text (they can copy manually)
      // If you use @react-native-clipboard/clipboard, replace this with Clipboard.setString(text)
      Alert.alert("Ciphertext (copy)", text);
    } catch (e) {
      Alert.alert("Meowcript", "Unable to copy.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <Text style={styles.header}>Meowcript — Secure Vault Branding</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Plaintext</Text>
        <TextInput value={plain} onChangeText={setPlain} placeholder="Type something private" placeholderTextColor="#7a5a68" style={styles.input} multiline />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Passphrase</Text>
        <TextInput value={pass} onChangeText={setPass} placeholder="Strong passphrase" placeholderTextColor="#7a5a68" style={styles.input} secureTextEntry />
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity onPress={handleEncrypt} style={[styles.button, styles.buttonPrimary]}>
          <Text style={styles.buttonText}>Encrypt</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleDecrypt} style={[styles.button, styles.buttonSecondary]}>
          <Text style={styles.buttonTextSecondary}>Decrypt</Text>
        </TouchableOpacity>
      </View>

      {out && (
        <View style={styles.resultCard}>
          <Text style={styles.smallLabel}>Watermark</Text>
          <Text style={styles.mono}>{out.watermark}</Text>

          <Text style={styles.smallLabel}>Ciphertext (base64)</Text>
          <Text style={styles.monoSmall} numberOfLines={6} ellipsizeMode="middle">{out.cipher}</Text>

          <Text style={styles.smallLabel}>Salt (base64)</Text>
          <Text style={styles.monoSmall}>{out.salt}</Text>

          <Text style={styles.smallLabel}>IV (base64)</Text>
          <Text style={styles.monoSmall}>{out.iv}</Text>

          <Text style={styles.smallLabel}>Claw mark (sha256)</Text>
          <Text style={styles.monoSmall}>{out.claw}</Text>

          <View style={{flexDirection: "row", marginTop: 10}}>
            <TouchableOpacity style={[styles.smallButton]} onPress={() => copyToClipboard(JSON.stringify(out))}>
              <Text style={styles.smallButtonText}>Copy JSON</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.smallButton, { marginLeft: 8 }]} onPress={() => copyToClipboard(out.cipher)}>
              <Text style={styles.smallButtonText}>Show Cipher</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {lastDecrypted !== null && (
        <View style={styles.resultCard}>
          <Text style={styles.smallLabel}>Decrypted plaintext</Text>
          <Text style={styles.mono}>{lastDecrypted}</Text>
        </View>
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 36,
    backgroundColor: "#000",
    minHeight: "100%",
  },
  header: {
    color: "#ffd7ec",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 14,
  },
  section: {
    marginBottom: 12,
  },
  label: {
    color: "#f1d3e3",
    marginBottom: 6,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#070607",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#ffe7f2",
    fontFamily: "monospace",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,111,181,0.06)",
  },
  actionsRow: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: {
    backgroundColor: "#ff2fa0",
    marginRight: 10,
    shadowColor: "#ff2fa0",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1.2,
    borderColor: "rgba(255,111,181,0.22)",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  buttonTextSecondary: {
    color: "#ffb7dc",
    fontWeight: "700",
  },
  resultCard: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#070307",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  smallLabel: {
    color: "#f5d7e6",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  mono: {
    color: "#ffdce6",
    fontFamily: "monospace",
    marginTop: 6,
  },
  monoSmall: {
    color: "#ffd0e6",
    fontFamily: "monospace",
    marginTop: 4,
    fontSize: 12,
  },
  smallButton: {
    backgroundColor: "rgba(255,111,181,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallButtonText: {
    color: "#ffd7ec",
    fontWeight: "700",
    fontSize: 12,
  },
});
