// src/components/PanicModal.js
import React from "react";
import { View, Text, Modal, TouchableOpacity, TextInput } from "react-native";
import styles from "../styles";

export default function PanicModal({ visible, onCancel, onConfirm, confirmText, setConfirmText }) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>CONFIRM PANIC WIPE</Text>
          <Text style={{ color: "#bfe", marginBottom: 8 }}>
            Type <Text style={{ fontWeight: "700" }}>CONFIRM</Text> to proceed. This action is irreversible.
          </Text>

          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Type CONFIRM"
            placeholderTextColor="#4f6c5a"
            style={styles.input}
            autoCapitalize="characters"
          />

          <View style={{ flexDirection: "row", marginTop: 12 }}>
            <TouchableOpacity style={[styles.buttonSecondary, { flex: 1, marginRight: 8 }]} onPress={onCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buttonPrimary, { flex: 1 }]}
              onPress={() => {
                if (confirmText === "CONFIRM") onConfirm();
                else alert("Confirmation did not match.");
              }}
            >
              <Text style={styles.buttonText}>Proceed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
