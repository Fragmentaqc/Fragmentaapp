import { useEffect, useRef } from 'react';
import { Animated, Image, ImageBackground, StyleSheet, Text, View } from 'react-native';

const pillars = ['CRÉER', 'EXPLORER', 'RACONTER', 'COLLECTIONNER', 'CONNECTER'];

export function LaunchIntro({ onFinish }: { onFinish: () => void }) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const wordsOpacity = useRef(new Animated.Value(0)).current;
  const wordsTranslate = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 7, tension: 42, useNativeDriver: true }),
      ]),
      Animated.delay(250),
      Animated.parallel([
        Animated.timing(wordsOpacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(wordsTranslate, { toValue: 0, duration: 650, useNativeDriver: true }),
      ]),
      Animated.delay(2850),
      Animated.timing(screenOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onFinish();
    });
  }, [logoOpacity, logoScale, onFinish, screenOpacity, wordsOpacity, wordsTranslate]);

  return (
    <Animated.View style={[styles.overlay, { opacity: screenOpacity }]}>
      <ImageBackground source={require('@/assets/images/D7K_3256.jpg')} resizeMode="cover" style={styles.background}>
        <View style={styles.shade} />
        <View style={styles.content}>
          <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
            <Image source={require('@/assets/images/android-icon-foreground.png')} resizeMode="contain" style={styles.logo} />
            <Text style={styles.brand}>FRAGMENTA</Text>
          </Animated.View>
          <Animated.View style={[styles.words, { opacity: wordsOpacity, transform: [{ translateY: wordsTranslate }] }]}>
            {pillars.map((pillar, index) => (
              <View key={pillar} style={styles.pillarRow}>
                {index > 0 && index !== 3 ? <View style={styles.dot} /> : null}
                <Text style={styles.pillar}>{pillar}</Text>
              </View>
            ))}
          </Animated.View>
        </View>
        <Text style={styles.signature}>L’AVENTURE SE RACONTE ICI</Text>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1000, backgroundColor: '#0B1710' },
  background: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6, 17, 10, 0.58)' },
  content: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, marginTop: -18 },
  logo: { width: 310, height: 310 },
  brand: { color: '#FFFFFF', fontSize: 20, lineHeight: 24, fontWeight: '900', letterSpacing: 5.5, textAlign: 'center', marginTop: -82, textShadowColor: 'rgba(0,0,0,.85)', textShadowRadius: 9 },
  words: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', marginTop: 25, paddingHorizontal: 14 },
  pillarRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 4, height: 4, backgroundColor: '#B86F4B', marginHorizontal: 9 },
  pillar: { color: '#F4E9D6', fontSize: 10, lineHeight: 22, fontWeight: '900', letterSpacing: 1.15, textShadowColor: 'rgba(0,0,0,.7)', textShadowRadius: 6 },
  signature: { position: 'absolute', bottom: 42, color: '#F4E9D6', fontSize: 9, fontWeight: '900', letterSpacing: 2.6, textShadowColor: 'rgba(0,0,0,.8)', textShadowRadius: 6 },
});
