import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExportDataScreen() {
  const [exporting, setExporting] = useState(false);

  async function exportData() {
    if (exporting) return;
    setExporting(true);
    try {
      const { data, error } = await supabase.rpc('export_my_data');
      if (error || !data) throw error ?? new Error('Export vide');
      const content = JSON.stringify(data, null, 2);
      const filename = `fragmenta-export-${new Date().toISOString().slice(0, 10)}.json`;

      if (Platform.OS === 'web') {
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
      } else if (Platform.OS === 'android') {
        const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permission.granted) { setExporting(false); return; }
        const uri = await FileSystem.StorageAccessFramework.createFileAsync(permission.directoryUri, filename, 'application/json');
        await FileSystem.writeAsStringAsync(uri, content);
        Alert.alert('Export terminé', 'Le fichier JSON a été enregistré dans le dossier choisi.');
      } else {
        const uri = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(uri, content);
        await Share.share({ title: 'Mes données Fragmenta', url: uri });
      }
    } catch (error) {
      console.error('Export des données impossible :', error);
      Alert.alert('Export impossible', 'Vérifie ta connexion et réessaie.');
    } finally {
      setExporting(false);
    }
  }

  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}>
    <Pressable onPress={router.back} disabled={exporting}><Text style={styles.back}>‹ Retour</Text></Pressable>
    <Text style={styles.eyebrow}>CONFIDENTIALITÉ</Text><Text style={styles.title}>Exporter mes données</Text>
    <Text style={styles.description}>Télécharge une copie structurée des informations associées à ton compte Fragmenta.</Text>
    <View style={styles.card}><Text style={styles.cardTitle}>Contenu de l’export</Text><Text style={styles.item}>• Profil et renseignements du compte</Text><Text style={styles.item}>• Aventures, fragments et curiosités</Text><Text style={styles.item}>• Photos et emplacements enregistrés</Text><Text style={styles.item}>• Favoris, signalements et blocages</Text><Text style={styles.item}>• Demandes de vérification</Text></View>
    <Text style={styles.notice}>Le fichier contient des renseignements personnels. Conserve-le dans un endroit sécuritaire.</Text>
    <Pressable style={[styles.button, exporting && styles.disabled]} onPress={() => void exportData()} disabled={exporting}>{exporting ? <ActivityIndicator color="#173E28" /> : <Text style={styles.buttonText}>Créer mon export JSON</Text>}</Pressable>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#173E28' }, container: { padding: 20, paddingBottom: 70 }, back: { color: '#E9576F', fontSize: 15, fontWeight: '800', marginBottom: 24 }, eyebrow: { color: '#E9576F', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: '#F5E6C8', fontSize: 28, fontWeight: '900', marginTop: 6 }, description: { color: '#D8CFBA', fontSize: 13, lineHeight: 20, marginTop: 10 }, card: { borderRadius: 0, borderWidth: 1, borderColor: '#5B8F5D', backgroundColor: '#245A35', padding: 17, marginTop: 23 }, cardTitle: { color: '#FFF1D6', fontSize: 15, fontWeight: '900', marginBottom: 8 }, item: { color: '#A2B3AB', fontSize: 12, lineHeight: 22 }, notice: { color: '#F0A36B', fontSize: 11, lineHeight: 18, marginTop: 18 }, button: { minHeight: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 0, backgroundColor: '#E9576F', marginTop: 22 }, buttonText: { color: '#173E28', fontSize: 14, fontWeight: '900' }, disabled: { opacity: 0.5 } });
