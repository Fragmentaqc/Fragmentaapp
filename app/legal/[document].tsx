import { LEGAL_UPDATED_AT, privacySections, termsSections } from '@/lib/legal-content';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LegalDocumentScreen() {
  const { document } = useLocalSearchParams<{ document: string }>();
  const privacy = document === 'privacy';
  const title = privacy ? 'Politique de confidentialité' : 'Conditions d’utilisation';
  const sections = privacy ? privacySections : termsSections;
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.container}>
    <Pressable onPress={router.back}><Text style={styles.back}>‹ Retour</Text></Pressable>
    <Text style={styles.eyebrow}>FRAGMENTA</Text><Text style={styles.title}>{title}</Text><Text style={styles.updated}>Dernière mise à jour : {LEGAL_UPDATED_AT}</Text>
    {sections.map((section) => <Text key={section.title} style={styles.section}><Text style={styles.heading}>{section.title}{'\n'}</Text>{section.paragraphs.join('\n\n')}</Text>)}
    <Text style={styles.review}>Ce document constitue une base adaptée au fonctionnement actuel de Fragmenta. Une validation juridique professionnelle est recommandée avant le lancement public.</Text>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#0B1710' }, container: { padding: 20, paddingBottom: 70 }, back: { color: '#B86F4B', fontSize: 15, fontWeight: '800', marginBottom: 24 }, eyebrow: { color: '#B86F4B', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: '#F4E9D6', fontSize: 28, lineHeight: 34, fontWeight: '900', marginTop: 6 }, updated: { color: '#BCC8B8', fontSize: 11, marginTop: 8, marginBottom: 12 }, section: { color: '#AFC2B9', fontSize: 13, lineHeight: 21, marginTop: 18 }, heading: { color: '#FBF1DF', fontSize: 16, fontWeight: '900' }, review: { color: '#C58A62', fontSize: 10, lineHeight: 16, marginTop: 28 } });
