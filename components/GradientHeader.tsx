import { ReactNode } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightColors } from '@/constants/colors';

type Props = {
  title: string;
  children?: ReactNode;
  colors?: typeof lightColors;
  style?: any;
};

export function GradientHeader({ title, children, colors, style }: Props) {
  const c = colors || lightColors;
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={[c.primary.light, c.primary.main]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, { paddingTop: insets.top + 16 }, style]}>
      {children}
      <Text style={styles.title}>{title}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Fraunces-Bold',
  },
});
