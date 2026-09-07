import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase, Customer } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openCustomerMap, shareCustomer } from '@/lib/customers';

export default function CustomerDetailScreen() {
  const { themeColors } = useTheme();
  const styles = getStyles(themeColors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        Alert.alert('Erro', 'Cliente não encontrado.');
        router.back();
        return;
      }
      setCustomer(data);
    } catch (e: any) {
      console.error('Erro ao carregar cliente:', e);
      Alert.alert('Erro', `Não foi possível carregar o cliente: ${e?.message || 'erro desconhecido'}`);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!customer) return;
    Alert.alert('Excluir Cliente', 'Deseja excluir este cliente?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            const { data, error } = await supabase
              .from('customers')
              .delete()
              .eq('id', customer.id)
              .select();
            if (error) {
              if (error.code === '23503') {
                Alert.alert(
                  'Não foi possível excluir',
                  'Este cliente possui pedidos vinculados. Exclua os pedidos dele primeiro.'
                );
                return;
              }
              throw error;
            }
            if (!data || data.length === 0) {
              console.error(
                'Delete de customer não afetou nenhuma linha (RLS ou permissão):',
                customer.id
              );
              Alert.alert(
                'Erro',
                'Não foi possível excluir: sem permissão para esta ação. Verifique a política de acesso no Supabase.'
              );
              return;
            }
            router.back();
          } catch (e: any) {
            console.error('Erro ao excluir cliente:', e);
            Alert.alert('Erro', `Não foi possível excluir o cliente: ${e?.message || 'erro desconhecido'}`);
          }
        },
      },
    ]);
  };

  if (loading || !customer) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={themeColors.primary.main} />
      </View>
    );
  }

  const getInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[themeColors.primary.light, themeColors.primary.main]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={themeColors.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {customer.name}
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </LinearGradient>

        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(customer.name)}</Text>
          </View>
          <Text style={styles.customerName}>{customer.name}</Text>
        </View>

        <View style={styles.infoCard}>
          {customer.phone ? (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color={themeColors.primary.dark} />
              <Text style={styles.infoText}>{customer.phone}</Text>
            </View>
          ) : null}
          {customer.email ? (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color={themeColors.primary.dark} />
              <Text style={styles.infoText}>{customer.email}</Text>
            </View>
          ) : null}
          {customer.cpf_cnpj ? (
            <View style={styles.infoRow}>
              <Ionicons name="card-outline" size={18} color={themeColors.primary.dark} />
              <Text style={styles.infoText}>{customer.cpf_cnpj}</Text>
            </View>
          ) : null}
          {customer.address ? (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={themeColors.primary.dark} />
              <Text style={styles.infoText}>
                {customer.address}
                {customer.city ? `, ${customer.city}` : ''}
                {customer.state ? ` - ${customer.state}` : ''}
                {customer.zipcode ? `\nCEP: ${customer.zipcode}` : ''}
              </Text>
            </View>
          ) : null}
          {customer.notes ? (
            <View style={styles.infoRow}>
              <Ionicons name="document-text-outline" size={18} color={themeColors.primary.dark} />
              <Text style={styles.infoText}>{customer.notes}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => openCustomerMap(customer.address, customer.city)}>
            <Ionicons name="location" size={20} color={themeColors.white} />
            <Text style={styles.quickActionText}>Mapa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => shareCustomer(customer)}>
            <Ionicons name="share-social" size={20} color={themeColors.white} />
            <Text style={styles.quickActionText}>Compartilhar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mainActions}>
          <TouchableOpacity
            style={[styles.mainActionBtn, styles.editBtn]}
            onPress={() => router.push(`/(tabs)/customers?editId=${customer.id}`)}>
            <Ionicons name="pencil" size={18} color={themeColors.primary.dark} />
            <Text style={styles.editBtnText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mainActionBtn, styles.deleteBtn]} onPress={handleDelete}>
            <Ionicons name="trash" size={18} color={themeColors.error} />
            <Text style={styles.deleteBtnText}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    headerCenter: { flex: 1, marginHorizontal: 12 },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.white,
      fontFamily: 'Fraunces-Bold',
      textAlign: 'center',
    },
    avatarSection: { alignItems: 'center', marginTop: 24, marginBottom: 8 },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary.light,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    avatarText: { fontSize: 28, fontWeight: '700', color: colors.primary.dark },
    customerName: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text.primary,
      fontFamily: 'Fraunces-Bold',
    },
    infoCard: {
      marginHorizontal: 20,
      marginTop: 20,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 14,
    },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    infoText: {
      flex: 1,
      fontSize: 14,
      color: colors.text.primary,
      fontFamily: 'WorkSans-Regular',
      lineHeight: 20,
    },
    quickActions: {
      flexDirection: 'row',
      gap: 12,
      marginHorizontal: 20,
      marginTop: 20,
    },
    quickActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.primary.main,
      paddingVertical: 12,
      borderRadius: 10,
    },
    quickActionText: { color: colors.white, fontWeight: '600', fontFamily: 'WorkSans-SemiBold' },
    mainActions: {
      flexDirection: 'row',
      gap: 12,
      marginHorizontal: 20,
      marginTop: 16,
      marginBottom: 32,
    },
    mainActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    editBtn: { borderColor: colors.primary.dark, backgroundColor: colors.surface },
    editBtnText: { color: colors.primary.dark, fontWeight: '600', fontFamily: 'WorkSans-SemiBold' },
    deleteBtn: { borderColor: colors.error, backgroundColor: colors.surface },
    deleteBtnText: { color: colors.error, fontWeight: '600', fontFamily: 'WorkSans-SemiBold' },
  });
