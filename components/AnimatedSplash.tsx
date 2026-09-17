import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

// Paleta exclusiva desta cena (preta/dourada) — independente de constants/colors.ts,
// que continua sendo a paleta do app (fundo claro).
const SCENE_BLACK = '#050505';
const GOLD = '#D4AF37';
const GOLD_BRIGHT = '#FFDF00';
const BRONZE = '#AA7A1E';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const LOGO_CARD_SIZE = Math.min(SCREEN_W * 0.56, 260);

type Props = {
  onFinish: () => void;
};

// Duração de cada sub-fase em ms, convertida do storyboard em frames @30fps
const T = {
  p1a: 250,  // 0.00-0.25s
  p1b: 250,  // 0.25-0.50s
  p1c: 500,  // 0.50-1.00s
  p2a: 250,  // 1.00-1.25s
  p2b: 500,  // 1.25-1.75s
  p2c: 250,  // 1.75-2.00s
  p3a: 500,  // 2.00-2.50s
  p3b: 500,  // 2.50-3.00s
  p3c: 250,  // 3.00-3.25s
  p4a: 250,  // 3.25-3.50s
  p4b: 250,  // 3.50-3.75s
  p4c: 250,  // 3.75-4.00s
  p5a: 500,  // 4.00-4.50s
  p5b: 500,  // 4.50-5.00s
};
const TOTAL_MS = Object.values(T).reduce((a, b) => a + b, 0); // 5000

const EASE = Easing.bezier(0.33, 0, 0.2, 1);

export default function AnimatedSplash({ onFinish }: Props) {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.98);
  const translateY = useSharedValue(0);

  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.3);

  const shimmerOpacity = useSharedValue(0);
  const shimmerX = useSharedValue(-LOGO_CARD_SIZE);

  const shimmer2Opacity = useSharedValue(0);
  const shimmer2X = useSharedValue(-LOGO_CARD_SIZE);

  const textOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);

  const particlesOpacity = useSharedValue(0);

  const sceneOpacity = useSharedValue(1);

  useEffect(() => {
    logoOpacity.value = withSequence(
      withTiming(0.15, { duration: T.p1a, easing: EASE }),
      withTiming(0.4, { duration: T.p1b, easing: EASE }),
      withTiming(0.6, { duration: T.p1c, easing: EASE }),
      withTiming(1, { duration: T.p2a, easing: EASE }),
      withTiming(1, { duration: T.p2b }),
      withTiming(1, { duration: T.p2c }),
      withTiming(1, { duration: T.p3a + T.p3b + T.p3c }),
      withTiming(1, { duration: T.p4a + T.p4b + T.p4c }),
      withTiming(0.3, { duration: T.p5a, easing: EASE }),
      withTiming(0, { duration: T.p5b, easing: EASE }, finished => {
        if (finished) runOnJS(onFinish)();
      })
    );

    logoScale.value = withSequence(
      withTiming(1, { duration: T.p1a + T.p1b, easing: EASE }),
      withTiming(1, { duration: T.p1c }),
      withTiming(1.02, { duration: T.p2a, easing: EASE }),
      withTiming(1.02, { duration: T.p2b + T.p2c }),
      withTiming(1.02, { duration: T.p3a + T.p3b + T.p3c }),
      withTiming(1, { duration: T.p4a, easing: EASE }),
      withTiming(1, { duration: T.p4b + T.p4c + T.p5a + T.p5b })
    );

    translateY.value = withDelay(
      T.p1a + T.p1b + T.p1c + T.p2a + T.p2b + T.p2c + T.p3a + T.p3b + T.p3c,
      withTiming(-5, { duration: T.p4a, easing: EASE })
    );

    glowOpacity.value = withSequence(
      withTiming(0, { duration: T.p1a + T.p1b }),
      withTiming(0.25, { duration: T.p1c, easing: EASE }),
      withTiming(0.45, { duration: T.p2a, easing: EASE }),
      withTiming(0.7, { duration: T.p2b, easing: EASE }),
      withTiming(0.7, { duration: T.p2c }),
      withTiming(0.75, { duration: T.p3a }),
      withTiming(1, { duration: T.p3b, easing: EASE }),
      withTiming(0.35, { duration: T.p3c, easing: EASE }),
      withTiming(0.3, { duration: T.p4a + T.p4b }),
      withTiming(0.4, { duration: T.p4c, easing: EASE }),
      withTiming(0.1, { duration: T.p5a, easing: EASE }),
      withTiming(0, { duration: T.p5b, easing: EASE })
    );

    glowScale.value = withSequence(
      withTiming(0.3, { duration: T.p1a + T.p1b + T.p1c }),
      withTiming(0.5, { duration: T.p2a + T.p2b + T.p2c, easing: EASE }),
      withTiming(0.55, { duration: T.p3a }),
      withTiming(1.4, { duration: T.p3b, easing: EASE }),
      withTiming(0.9, { duration: T.p3c, easing: EASE }),
      withTiming(0.85, { duration: T.p4a + T.p4b + T.p4c }),
      withTiming(0.6, { duration: T.p5a + T.p5b, easing: EASE })
    );

    const shimmer1Delay = T.p1a + T.p1b + T.p1c + T.p2a;
    shimmerOpacity.value = withDelay(
      shimmer1Delay,
      withSequence(
        withTiming(0.9, { duration: T.p2b * 0.15 }),
        withTiming(0.9, { duration: T.p2b * 0.7 }),
        withTiming(0, { duration: T.p2b * 0.15 })
      )
    );
    shimmerX.value = withDelay(
      shimmer1Delay,
      withTiming(LOGO_CARD_SIZE, { duration: T.p2b, easing: Easing.linear })
    );

    const shimmer2Delay =
      T.p1a + T.p1b + T.p1c + T.p2a + T.p2b + T.p2c + T.p3a + T.p3b + T.p3c + T.p4a;
    shimmer2Opacity.value = withDelay(
      shimmer2Delay,
      withSequence(
        withTiming(0.5, { duration: T.p4b * 0.2 }),
        withTiming(0.5, { duration: T.p4b * 0.6 }),
        withTiming(0, { duration: T.p4b * 0.2 })
      )
    );
    shimmer2X.value = withDelay(
      shimmer2Delay,
      withTiming(LOGO_CARD_SIZE, { duration: T.p4b, easing: Easing.linear })
    );

    textOpacity.value = withSequence(
      withTiming(0, { duration: T.p1a + T.p1b }),
      withTiming(0.2, { duration: T.p1c, easing: EASE }),
      withTiming(0.2, { duration: T.p2a }),
      withTiming(0.6, { duration: T.p2b + T.p2c, easing: EASE }),
      withTiming(0.6, { duration: T.p3a + T.p3b }),
      withTiming(1, { duration: T.p3c, easing: EASE }),
      withTiming(1, { duration: T.p4a + T.p4b + T.p4c }),
      withTiming(0.3, { duration: T.p5a, easing: EASE }),
      withTiming(0, { duration: T.p5b, easing: EASE })
    );

    taglineOpacity.value = withDelay(
      T.p1a + T.p1b + T.p1c + T.p2a + T.p2b + T.p2c + T.p3a + T.p3b,
      withSequence(
        withTiming(0.8, { duration: T.p3c + T.p4a, easing: EASE }),
        withTiming(0.8, { duration: T.p4b + T.p4c }),
        withTiming(0, { duration: T.p5a + T.p5b, easing: EASE })
      )
    );

    const particlesDelay =
      T.p1a + T.p1b + T.p1c + T.p2a + T.p2b + T.p2c + T.p3a + T.p3b + T.p3c;
    particlesOpacity.value = withDelay(
      particlesDelay,
      withSequence(
        withTiming(1, { duration: T.p4a, easing: EASE }),
        withTiming(1, { duration: T.p4b + T.p4c + T.p5a * 0.4 }),
        withTiming(0, { duration: T.p5a * 0.6 + T.p5b, easing: EASE })
      )
    );

    sceneOpacity.value = withDelay(TOTAL_MS - 400, withTiming(0, { duration: 400, easing: EASE }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }, { translateY: translateY.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
    transform: [{ translateX: shimmerX.value }, { rotate: '18deg' }],
  }));

  const shimmer2Style = useAnimatedStyle(() => ({
    opacity: shimmer2Opacity.value,
    transform: [{ translateX: shimmer2X.value }, { rotate: '18deg' }],
  }));

  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));
  const particlesStyle = useAnimatedStyle(() => ({ opacity: particlesOpacity.value }));
  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneOpacity.value }));

  const particles = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        left: 20 + Math.random() * (LOGO_CARD_SIZE - 40),
        top: 20 + Math.random() * (LOGO_CARD_SIZE - 40),
        delay: Math.random() * 400,
        size: 2 + Math.random() * 3,
      })),
    []
  );

  return (
    <Animated.View style={[styles.container, sceneStyle]}>
      <Animated.View style={[styles.glow, glowStyle]}>
        <View style={[styles.glowRing, { opacity: 0.15, width: 340, height: 340, borderRadius: 170 }]} />
        <View style={[styles.glowRing, { opacity: 0.25, width: 240, height: 240, borderRadius: 120 }]} />
        <View style={[styles.glowRing, { opacity: 0.4, width: 160, height: 160, borderRadius: 80 }]} />
      </Animated.View>

      <Animated.View style={[styles.logoCard, logoStyle]}>
        <Image
          source={require('../assets/images/logo-splash.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
          <Animated.View style={[styles.shimmerBar, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,223,0,0.55)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <Animated.View style={[styles.shimmerBar, shimmer2Style]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,223,0,0.3)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </Animated.View>

      <Animated.View style={[styles.particlesLayer, particlesStyle, { pointerEvents: 'none' }]}>
        {particles.map(p => (
          <Particle key={p.id} left={p.left} top={p.top} delay={p.delay} size={p.size} />
        ))}
      </Animated.View>

      <Animated.Text style={[styles.wordmark, textStyle]}>MUROUNE DECOR</Animated.Text>
      <Animated.Text style={[styles.tagline, taglineStyle]}>
        Resiliência que transforma ambientes
      </Animated.Text>
    </Animated.View>
  );
}

function Particle({
  left,
  top,
  delay,
  size,
}: {
  left: number;
  top: number;
  delay: number;
  size: number;
}) {
  const opacity = useSharedValue(0);
  const y = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.9, { duration: 350, easing: EASE }),
        withTiming(0.9, { duration: 500 }),
        withTiming(0, { duration: 400, easing: EASE })
      )
    );
    y.value = withDelay(delay, withTiming(-16, { duration: 1250, easing: EASE }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View
      style={[styles.particle, { left, top, width: size, height: size, borderRadius: size / 2 }, style]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SCENE_BLACK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    backgroundColor: GOLD_BRIGHT,
  },
  logoCard: {
    width: LOGO_CARD_SIZE,
    height: LOGO_CARD_SIZE,
    borderRadius: 28,
    backgroundColor: '#FBF7EE',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '78%',
    height: '78%',
  },
  shimmerBar: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    width: 60,
  },
  particlesLayer: {
    position: 'absolute',
    width: LOGO_CARD_SIZE,
    height: LOGO_CARD_SIZE,
  },
  particle: {
    position: 'absolute',
    backgroundColor: GOLD_BRIGHT,
  },
  wordmark: {
    position: 'absolute',
    bottom: SCREEN_H * 0.16,
    fontSize: 22,
    letterSpacing: 4,
    color: GOLD,
    fontFamily: 'Fraunces-Bold',
  },
  tagline: {
    position: 'absolute',
    bottom: SCREEN_H * 0.12,
    fontSize: 12,
    letterSpacing: 1,
    color: BRONZE,
    fontFamily: 'WorkSans-Regular',
  },
});
