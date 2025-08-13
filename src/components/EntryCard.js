// src/components/EntryCard.js
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import styles from "../styles";


export default function EntryCard({ item, onView }) {
  return (
    <View style={styles.entryCard}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.entryMeta}>{new Date(item.timestamp).toLocaleString()}</Text>
        <Text style={styles.entryMetaSmall}>ID: {item.id?.slice(0, 10)}</Text>
      </View>
      <View style={{ marginTop: 6 }}>
        <Text style={styles.entryHash}>HMAC: {item.hmac?.slice(0, 16)}...</Text>
      </View>
      <View style={{ flexDirection: "row", marginTop: 8, justifyContent: "flex-end" }}>
        <TouchableOpacity style={styles.smallBtn} onPress={() => onView(item)}>
          <Text style={styles.smallBtnText}>Decrypt & View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
