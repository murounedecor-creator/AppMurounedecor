import React, { useState } from 'react';
import { Pressable, Text, View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { lightColors, withOpacity } from '@/constants/colors';

interface MetallicButtonProps {
  label?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  style?: object;
  disabled?: boolean;
  circular?: boolean;
}

export default function MetallicButton({ label, icon, onPress, style, disabled, circular }: MetallicButtonProps) {
  const [pressed, setPressed] = useState(false);
  const c = lightColors;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.wrapper,
        circular && styles.wrapperCircular,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}>
      <LinearGradient
        colors={[
          withOpacity(c.primary.main, 0.65),
          withOpacity(c.primary.light, 0.45),
          withOpacity(c.primary.dark, 0.75),
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, circular && styles.gradientCircular]}>
        <BlurView intensity={30} tint="light" style={[styles.blur, circular && styles.blurCircular]}>
          <View style={styles.shine} />
          <View style={styles.content}>
            {icon}
            {label && (
              <Text style={styles.label}>{label}</Text>
            )}
          </View>
        </BlurView>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(lightColors.primary.light, 0.5),
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: lightColors.primary.dark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: { elevation: 8 },
    }),
  },
  gradient: {
    borderRadius: 12,
  },
  blur: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    position: 'relative',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: withOpacity(lightColors.primary.light, 0.6),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    color: lightColors.text.primary,
    fontWeight: '600',
    fontSize: 15,
    fontFamily: 'WorkSans-SemiBold',
    textShadowColor: withOpacity(lightColors.primary.light, 0.5),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  wrapperCircular: {
    borderRadius: 28,
    width: 56,
    height: 56,
  },
  gradientCircular: {
    borderRadius: 28,
  },
  blurCircular: {
    borderRadius: 28,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
});
