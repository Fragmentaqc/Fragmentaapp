import { useCollections } from '@/context/collections-context';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export function CollectionPicker({ target, visible, onClose }: { target: { type: 'adventure' | 'curiosity'; id: string }; visible: boolean; onClose: () => void }) {
  const { collections, loading, createCollection, toggleItem } = useCollections();
  const [name, setName] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  async function addCollection() {
    const id = await createCollection(name);
    if (!id) return Alert.alert('Création impossible', 'Entre un nom valide pour la collection.');
    setName('');
    await toggleItem(id, target);
  }

  async function toggle(collectionId: string) {
    setSavingId(collectionId);
    const success = await toggleItem(collectionId, target);
    setSavingId(null);
    if (!success) Alert.alert('Erreur', 'Impossible de modifier cette collection.');
  }

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.backdrop} onPress={onClose} />
    <View style={styles.sheet}>
      <View style={styles.header}><View><Text style={styles.eyebrow}>COLLECTIONS</Text><Text style={styles.title}>Enregistrer l’aventure</Text></View><Pressable onPress={onClose}><Text style={styles.close}>×</Text></Pressable></View>
      {loading ? <ActivityIndicator color="#E9576F" /> : collections.map((collection) => {
        const selected = target.type === 'adventure' ? collection.adventureIds.includes(target.id) : collection.curiosityIds.includes(target.id);
        return <Pressable key={collection.id} style={styles.row} onPress={() => void toggle(collection.id)} disabled={savingId === collection.id}>
          <View><Text style={styles.rowTitle}>{collection.name}</Text><Text style={styles.rowMeta}>{collection.adventureIds.length + collection.curiosityIds.length} élément(s)</Text></View>
          <Text style={[styles.check, selected && styles.checkSelected]}>{savingId === collection.id ? '…' : selected ? '✓' : '+'}</Text>
        </Pressable>;
      })}
      <View style={styles.createRow}><TextInput value={name} onChangeText={setName} placeholder="Nouvelle collection" placeholderTextColor="#6F837B" style={styles.input} maxLength={80} /><Pressable style={styles.createButton} onPress={() => void addCollection()}><Text style={styles.createButtonText}>Créer</Text></Pressable></View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.65)' },
  sheet: { maxHeight: '72%', backgroundColor: '#245A35', borderTopWidth: 1, borderColor: '#5B8F5D', padding: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  eyebrow: { color: '#E9576F', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#F5E6C8', fontSize: 24, fontWeight: '900', marginTop: 4 },
  close: { color: '#F5E6C8', fontSize: 34, lineHeight: 36 },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#214337', paddingVertical: 10 },
  rowTitle: { color: '#F5E6C8', fontSize: 15, fontWeight: '800' },
  rowMeta: { color: '#789086', fontSize: 11, marginTop: 3 },
  check: { width: 34, height: 34, color: '#E9576F', fontSize: 22, lineHeight: 32, textAlign: 'center', borderWidth: 1, borderColor: '#7BA578' },
  checkSelected: { color: '#173E28', backgroundColor: '#E9576F' },
  createRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  input: { flex: 1, height: 48, color: '#F5E6C8', borderWidth: 1, borderColor: '#7BA578', paddingHorizontal: 12 },
  createButton: { height: 48, justifyContent: 'center', backgroundColor: '#E9576F', paddingHorizontal: 18 },
  createButtonText: { color: '#173E28', fontSize: 13, fontWeight: '900' },
});
