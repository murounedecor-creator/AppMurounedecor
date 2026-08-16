import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MenuRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

function MenuRow({ icon, label, onPress, danger }: MenuRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Ionicons
        name={icon}
        size={20}
        color={danger ? colors.error : colors.primary.dark}
      />
      <Text style={[styles.rowLabel, danger && { color: colors.error }]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={colors.text.light} />
    </TouchableOpacity>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const { isDarkMode, toggleTheme, themeColors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Menu</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={[styles.businessCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={[styles.businessIcon, { backgroundColor: themeColors.primary.light }]}>
            <Ionicons name="storefront" size={22} color={themeColors.primary.dark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.businessName, { color: themeColors.text.primary }]}>
              Muroune Decorações
            </Text>
            <Text style={[styles.businessTagline, { color: themeColors.text.secondary }]}>
              Resiliência que transforma ambientes
            </Text>
          </View>
        </View>

        <SectionLabel>Catálogos</SectionLabel>
        <MenuRow
          icon="cube-outline"
          label="Produtos"
          onPress={() => router.push('/(tabs)/products')}
        />
        <MenuRow
          icon="construct-outline"
          label="Serviços"
          onPress={() => router.push('/services-em-breve')}
        />

        <SectionLabel>Documentos</SectionLabel>
        <MenuRow
          icon="create-outline"
          label="Assinatura e logo"
          onPress={() => router.push('/em-breve')}
        />
        <MenuRow
          icon="document-text-outline"
          label="Nota padrão dos documentos"
          onPress={() => router.push('/em-breve')}
        />

        <TouchableOpacity
          style={[styles.proCard, { backgroundColor: themeColors.primary.light }]}
          onPress={() => router.push('/em-breve')}>
          <Ionicons name="ribbon" size={24} color={themeColors.primary.dark} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.proTitle, { color: themeColors.primary.dark }]}>
              Muroune Decor PRO
            </Text>
            <Text style={[styles.proSubtitle, { color: themeColors.text.secondary }]}>
              Plano gratuito ativo
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={themeColors.primary.dark} />
        </TouchableOpacity>

        <SectionLabel>Aparência</SectionLabel>
        <View style={[styles.row, { borderBottomColor: themeColors.border }]}>
          <Ionicons
            name={isDarkMode ? 'moon' : 'sunny-outline'}
            size={20}
            color={themeColors.primary.dark}
          />
          <Text style={[styles.rowLabel, { color: themeColors.text.primary }]}>
            Modo noturno
          </Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: themeColors.border, true: themeColors.primary.main }}
            thumbColor={themeColors.white}
          />
        </View>

        <SectionLabel>Conta</SectionLabel>
        <MenuRow
          icon="business-outline"
          label="Dados do negócio"
          onPress={() => router.push('/em-breve')}
        />
        <MenuRow
          icon="log-out-outline"
          label="Sair"
          danger
          onPress={() => router.push('/em-breve')}
        />

        <Text style={[styles.version, { color: themeColors.text.light }]}>
          Muroune Decor · versão 1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: colors.primary.main,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
  },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  businessIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessName: {
    fontSize: 15,
    fontWeight: '600',
  },
  businessTagline: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.light,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
  },
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
  },
  proTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  proSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 20,
    marginBottom: 30,
  },
});
