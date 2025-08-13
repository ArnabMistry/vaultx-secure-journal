// src/components/AuditModal.js
import React from "react";
import { View, Modal, Text, TouchableOpacity, ScrollView } from "react-native";
import styles from "../styles";

export default function AuditModal({ visible, onClose, meta, tamperLog, lastVerifiedAt }) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalBoxLarge}>
          <Text style={styles.modalTitle}>Audit Log</Text>
          <ScrollView style={{ maxHeight: 380 }}>
            <Text style={styles.auditLine}>Algorithm: AES-256-CBC (client-side)</Text>
            <Text style={styles.auditLine}>HMAC: HMAC-SHA256</Text>
            <Text style={styles.auditLine}>PBKDF2 iterations: {meta?.pbkdf2Iterations || "stored"}</Text>
            <Text style={styles.auditLine}>Salt (truncated): {meta?.saltTruncated || "stored"}</Text>
            <Text style={styles.auditLine}>Created: {meta?.created || "stored"}</Text>
            <Text style={{ color: "#d0e9d3", marginTop: 12 }}>Tamper Log (last 500)</Text>
            <View style={{ marginTop: 8 }}>
              {tamperLog.slice(0, 500).map((log, idx) => (
                <Text key={idx} style={styles.logLine}>
                  {log.ts} — {log.event} {log.detail ? `: ${log.detail}` : ""}
                </Text>
              ))}
            </View>
            <Text style={{ color: "#d0e9d3", marginTop: 12 }}>Last verified: {lastVerifiedAt || "never"}</Text>
          </ScrollView>

          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <TouchableOpacity style={[styles.buttonPrimary, { flex: 1 }]} onPress={onClose}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
