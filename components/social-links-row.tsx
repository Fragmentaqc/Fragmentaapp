import { SOCIAL_ICONS, normalizeSocialUrl, type SocialLink } from '@/lib/social-links';
import { FontAwesome6 } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

export function SocialLinksRow({ links }: { links: SocialLink[] }) {
  if (links.length === 0) return null;

  return (
    <View style={styles.row}>
      {links.map((link, index) => (
        <Pressable
          accessibilityLabel={`Ouvrir ${link.platform}`}
          accessibilityRole="link"
          key={`${link.platform}-${index}`}
          onPress={() => void Linking.openURL(normalizeSocialUrl(link.url, link.platform))}
          style={styles.button}
        >
          <FontAwesome6 name={(SOCIAL_ICONS[link.platform] || 'link') as never} size={19} color="#FFFFFF" />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 9, paddingHorizontal: 16, marginTop: 14 },
  button: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: '#21472F' },
});
