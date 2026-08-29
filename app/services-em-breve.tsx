import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ServicesEmBreveScreen() {
  const { themeColors } = useTheme();
  const styles = getStyles(themeColors);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={themeColors.primary.dark} />
      </TouchableOpacity>
      <View style={styles.content}>
        <Ionicons name="construct-outline" size={48} color={themeColors.text.light} />
        <Text style={styles.title}>Catálogo de Serviços</Text>
        <Text style={styles.subtitle}>
          Essa tela está em construção. Em breve você vai poder cadastrar,
          editar e organizar seus serviços por aqui, assim como já faz com
          Produtos.
        </Text>
      </View>
    </View>
  );
}

const getStyles = (colors: typeof lightColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: 'Fraunces-SemiBold',
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'WorkSans-Regular',
  },
});
