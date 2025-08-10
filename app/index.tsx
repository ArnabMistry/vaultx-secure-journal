import React, { useState, useEffect } from 'react';
import { View, Text, Button, ScrollView, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

import PanicModal from '../src/components/PanicModal';
import { getAllEntries, deleteAllEntries } from '../src/storage';

export default function HomeScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>([]);
  const [showPanic, setShowPanic] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await getAllEntries();
      setEntries(stored);
    })();
  }, []);

  const handlePanicWipe = async () => {
    await deleteAllEntries();
    await SecureStore.deleteItemAsync('master_key');
    setEntries([]);
    setShowPanic(false);
    Alert.alert('All data wiped securely.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>VaultX</Text>

      <ScrollView style={styles.entries}>
        {entries.length === 0 ? (
          <Text style={styles.noEntries}>No entries yet.</Text>
        ) : (
          entries.map((entry, idx) => (
            <View key={idx} style={styles.entryCard}>
              <Text style={styles.entryText}>{entry.text}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Button title="Add Entry" onPress={() => router.push('/new-entry')} />
        <Button title="Panic Wipe" color="red" onPress={() => setShowPanic(true)} />
      </View>

      <PanicModal
        visible={showPanic}
        onCancel={() => setShowPanic(false)}
        onConfirm={handlePanicWipe}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0b0c10' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#66fcf1', marginBottom: 10 },
  entries: { flex: 1, marginTop: 10 },
  noEntries: { color: '#c5c6c7', fontSize: 16, textAlign: 'center', marginTop: 20 },
  entryCard: { backgroundColor: '#1f2833', padding: 15, borderRadius: 8, marginBottom: 10 },
  entryText: { color: '#c5c6c7' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
});
