import { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { lightColors } from '@/constants/colors';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  colors?: typeof lightColors;
  style?: any;
  textStyle?: any;
};

export function GradientButton({ children, onPress, disabled, colors, style, textStyle }: Props) {
  const c = colors || lightColors;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.container, style]}>
      <LinearGradient
        colors={[c.primary.main, c.primary.dark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, style]}>
        <Text style={[styles.text, textStyle]}>{children}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'WorkSans-Bold',
  },
});
