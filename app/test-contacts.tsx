import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert, ScrollView } from 'react-native';
import { colors } from '@/constants/colors';

const Contacts = Platform.OS !== 'web' ? require('expo-contacts') : null;

export default function TestContactsScreen() {
  const [status, setStatus] = useState('Aguardando teste');
  const [count, setCount] = useState<number | null>(null);

  const handleTest = async () => {
    if (Platform.OS === 'web' || !Contacts) {
      setStatus('Não disponível na web — teste precisa ser feito no APK instalado no celular');
      return;
    }
    try {
      setStatus('Pedindo permissão...');
      const { status: permStatus } = await Contacts.requestPermissionsAsync();
      if (permStatus !== 'granted') {
        setStatus('Permissão negada pelo usuário');
        return;
      }
      setStatus('Lendo contatos...');
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      });
      setCount(data.length);
      setStatus('Sucesso! Contatos lidos sem crash.');
    } catch (error: any) {
      console.error('Erro no teste de contatos:', error);
      setStatus('ERRO: ' + (error?.message || 'falha desconhecida'));
      Alert.alert('Erro no teste', error?.message || 'Falha desconhecida ao ler contatos');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Text style={styles.title}>Teste Isolado — Agenda de Contatos</Text>
      <Text style={styles.subtitle}>
        Esta tela é temporária, só pra validar se a lib expo-contacts funciona neste
        projeto sem crashar. Não afeta o cadastro de Cliente.
      </Text>
      <TouchableOpacity style={styles.button} onPress={handleTest}>
        <Text style={styles.buttonText}>Testar Leitura de Contatos</Text>
      </TouchableOpacity>
      <Text style={styles.status}>{status}</Text>
      {count !== null && (
        <Text style={styles.count}>Total de contatos encontrados: {count}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  title: { fontSize: 20, fontWeight: '700', color: colors.primary.dark, marginBottom: 8, fontFamily: 'Fraunces-Bold' },
  subtitle: { fontSize: 13, color: colors.text.secondary, marginBottom: 20, fontFamily: 'WorkSans-Regular' },
  button: {
    backgroundColor: colors.primary.main,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700', fontFamily: 'WorkSans-Bold' },
  status: { fontSize: 14, color: colors.text.primary, marginTop: 8, fontFamily: 'WorkSans-Regular' },
  count: { fontSize: 14, fontWeight: '600', color: colors.primary.dark, marginTop: 8, fontFamily: 'WorkSans-SemiBold' },
});
