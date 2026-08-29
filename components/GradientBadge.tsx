import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { lightColors } from '@/constants/colors';

type Props = {
  label: string;
  colors?: typeof lightColors;
  style?: any;
};

export function GradientBadge({ label, colors, style }: Props) {
  const c = colors || lightColors;

  return (
    <LinearGradient
      colors={[c.primary.main, c.primary.dark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, style]}>
      <Text style={styles.text}>{label}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'WorkSans-SemiBold',
  },
});
