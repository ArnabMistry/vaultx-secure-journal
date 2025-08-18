// meowdetail.js
import React, { useState, useMemo } from "react";
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";

let Clipboard = null;
try {
  // try common clipboard packages; fall back gracefully if not installed
  // prefer @react-native-clipboard/clipboard, then expo-clipboard
  // if neither present, Clipboard will remain null and we use Alert fallback
  Clipboard =
    require("@react-native-clipboard/clipboard").default ||
    require("expo-clipboard").default;
} catch (e) {
  Clipboard = null;
}

/**
 * MeowDetail
 * Professional Security & Compliance Disclosure modal for Meowcript™
 *
 * Props:
 * - visible: boolean
 * - onClose: () => void
 */
export default function MeowDetail({ visible, onClose }) {
  const [showTechnical, setShowTechnical] = useState(false);

  const technicalText = useMemo(() => {
    return [
      "Meowcript™ — Technical Summary (v1)",
      "",
      "Algorithms & primitives:",
      "- Content cipher: XChaCha20-Poly1305 (AEAD) or AES-256-GCM (fallback)",
      "- Key derivation: Argon2id (recommended params: mem=128MiB, iter=3, parallel=2)",
      "- Per-record CEK (random 256-bit) with two-layer wrapping:",
      "  • Wrapped by K_pass (Argon2id(passphrase, salt))",
      "  • Wrapped by K_dev (hardware-bound non-exportable key via Secure Enclave / Keystore)",
      "- Authenticated metadata: watermark (=^.^= Meowcript™ v1.0) included as AAD",
      "",
      "Storage artifacts included with each record: header (version, kdf params, salts), nonces, device-wrapped CEK, ciphertext, integrity claw (SHA-256)",
      "",
      "Operational controls:",
      "- Zero-knowledge design: server/provider never has plaintext or passphrase",
      "- Rate limiting and fail-lockout recommended",
      "- Device compromise remains a primary risk vector; use hardware-backed keys and OS hardening",
      "",
      "For retrieval: device must supply K_dev; user must supply passphrase to derive K_pass. Both are required to unwrap per-record CEK and decrypt content.",
    ].join("\n");
  }, []);

  const copyTechnical = async () => {
    try {
      if (Clipboard && Clipboard.setString) {
        Clipboard.setString(technicalText);
        Alert.alert("Copied", "Technical summary copied to clipboard.");
        return;
      }
      // fallback: show the text to the user so they can copy manually
      Alert.alert("Technical summary", technicalText, [{ text: "OK" }], {
        cancelable: true,
      });
    } catch (e) {
      Alert.alert("Unable to copy", "Please copy the technical summary manually.");
    }
  };

  const exportTechnical = async () => {
    // lightweight export fallback: copy to clipboard (same action) + show Notice
    await copyTechnical();
    Alert.alert(
      "Export",
      "Technical summary prepared. Paste into your external secure note or document as required."
    );
  };

  return (
    <Modal
      visible={!!visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.brand}>Meowcript™</Text>
            <Text style={styles.title}>Security & Compliance Disclosure</Text>
            <Text style={styles.subtitle}>
              A concise technical and legal summary of Meowcript™. This disclosure explains the
              cryptographic foundations, limitations, and recommended operational controls.
            </Text>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Encryption Standard</Text>
              <Text style={styles.sectionBody}>
                Meowcript™ employs industry-standard authenticated encryption (AEAD) for all content.
                The primary algorithm is XChaCha20-Poly1305; AES-256-GCM is supported where required.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Integrity and Authentication</Text>
              <Text style={styles.sectionBody}>
                Each payload is authenticated using AEAD and supplemented with an integrity digest
                computed over header and ciphertext. Any modification of stored data is reliably detected.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Key Management</Text>
              <Text style={styles.sectionBody}>
                Per-record encryption keys (CEKs) are randomly generated and wrapped using a layered
                key model: a passphrase-derived key (Argon2id) and a device-bound hardware key
                (Secure Enclave / Android Keystore). The CEK never exists in persistent plaintext.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Zero-Knowledge & Privacy</Text>
              <Text style={styles.sectionBody}>
                Meowcript™ adheres to a zero-knowledge architecture. Plaintext material and user
                credentials are not accessible to any third party. Local encryption occurs prior
                to optional persistence or transmission.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Limitations & User Responsibilities</Text>
              <Text style={styles.sectionBody}>
                Meowcript™ provides strong cryptographic protections, but cannot protect against
                device-level compromise (malware, physical access to an unlocked device, or
                OS-level root/jailbreak). Users must maintain device hygiene, secure backups, and
                strong passphrases. Enabling hardware-backed keys and biometric locking is strongly
                recommended.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Compliance & Standards</Text>
              <Text style={styles.sectionBody}>
                Implementations follow NIST recommendations for authenticated encryption and
                key derivation. Meowcript™ is designed to support organizational compliance needs
                such as GDPR and data segregation requirements where applicable.
              </Text>
            </View>

            <View style={styles.separator} />

            {/* Technical appendix toggle */}
            <TouchableOpacity
              onPress={() => setShowTechnical((v) => !v)}
              style={styles.techToggle}
              accessibilityLabel="Toggle technical appendix"
            >
              <Text style={styles.techToggleText}>
                {showTechnical ? "Hide technical appendix" : "View technical appendix"}
              </Text>
            </TouchableOpacity>

            {showTechnical && (
              <View style={styles.techBox}>
                <Text style={styles.techMono}>{technicalText}</Text>
                <View style={styles.techActions}>
                  <TouchableOpacity style={styles.smallButton} onPress={copyTechnical}>
                    <Text style={styles.smallButtonText}>Copy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.smallButton, styles.smallButtonSecondary]} onPress={exportTechnical}>
                    <Text style={[styles.smallButtonText, styles.smallButtonTextSecondary]}>Export</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerTitle}>Acknowledgement</Text>
              <Text style={styles.footerBody}>
                By using Meowcript™, you acknowledge that you understand the protections and
                limitations described above. For organizational deployments, consult your security
                officer for configuration and key-management policies.
              </Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={onClose} style={[styles.actionButton, styles.actionSecondary]} accessibilityLabel="Close disclosure">
                <Text style={styles.actionSecondaryText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={[styles.actionButton, styles.actionPrimary]} accessibilityLabel="Acknowledge disclosure">
                <Text style={styles.actionPrimaryText}>I Understand</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const colors = {
  bgOverlay: "rgba(0,0,0,0.6)",
  card: "#ffffff",
  heading: "#111827",
  subHeading: "#6b7280",
  muted: "#374151",
  accent: "#ff2fa0", // pookie pink
  border: "#e6e6e6",
  monoBg: "#0b0b0b",
  monoText: "#fceaf3",
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.bgOverlay,
  },
  container: {
    flex: 1,
    marginHorizontal: 18,
    marginVertical: 36,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.card,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  scroll: {
    padding: 20,
  },
  brand: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    color: colors.heading,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    color: colors.subHeading,
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeading: {
    color: colors.heading,
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 6,
  },
  sectionBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 12,
    marginBottom: 12,
  },
  techToggle: {
    paddingVertical: 10,
  },
  techToggleText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 14,
  },
  techBox: {
    backgroundColor: "#0b0b0b",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  techMono: {
    color: colors.monoText,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace", default: "monospace" }),
    fontSize: 12,
    lineHeight: 18,
  },
  techActions: {
    flexDirection: "row",
    marginTop: 10,
  },
  smallButton: {
    backgroundColor: "rgba(255,47,160,0.08)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  smallButtonSecondary: {
    marginLeft: 10,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,47,160,0.14)",
  },
  smallButtonText: {
    color: colors.accent,
    fontWeight: "700",
    fontSize: 12,
  },
  smallButtonTextSecondary: {
    color: colors.accent,
  },
  footer: {
    marginTop: 18,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerTitle: {
    color: colors.heading,
    fontWeight: "700",
    fontSize: 13,
    marginBottom: 6,
  },
  footerBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
  },
  actionPrimary: {
    backgroundColor: colors.accent,
  },
  actionSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  actionPrimaryText: {
    color: "#fff",
    fontWeight: "800",
  },
  actionSecondaryText: {
    color: colors.muted,
    fontWeight: "700",
  },
});
