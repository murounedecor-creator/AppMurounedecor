import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { lightColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase, Customer } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Location = Platform.OS !== 'web' ? require('expo-location') : null;

interface VisitaDoDia {
  id: string;
  nome: string;
  telefone: string;
  endereco: string;
  cep: string;
  ordem: number;
  visitado: boolean;
}

export default function CustomersScreen() {
  const { themeColors } = useTheme();
  const styles = getStyles(themeColors);
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filtered, setFiltered] = useState<Customer[]>([]);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    cpf_cnpj: '',
    address: '',
    city: '',
    state: '',
    zipcode: '',
    notes: '',
  });

  // Visitas do Dia state
  const [abaAtiva, setAbaAtiva] = useState<'Clientes' | 'Visitas do Dia'>('Clientes');
  const [visitasDoDia, setVisitasDoDia] = useState<VisitaDoDia[]>([]);
  const [modalVisitas, setModalVisitas] = useState(false);
  const [searchVisitas, setSearchVisitas] = useState('');
  const [clientesSelecionados, setClientesSelecionados] = useState<string[]>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    const results = customers.filter(c =>
      c.name.toLowerCase().includes(searchText.toLowerCase())
    );
    setFiltered(results);
  }, [searchText, customers]);

  // Carregar visitas salvas ao abrir
  useEffect(() => {
    const carregarVisitas = async () => {
      try {
        const data = await AsyncStorage.getItem('visitas_do_dia');
        if (data) setVisitasDoDia(JSON.parse(data));
      } catch (error) {
        console.error('Erro ao carregar visitas:', error);
      }
    };
    carregarVisitas();
  }, []);

  // Salvar sempre que mudar
  useEffect(() => {
    AsyncStorage.setItem('visitas_do_dia', JSON.stringify(visitasDoDia)).catch(error =>
      console.error('Erro ao salvar visitas:', error)
    );
  }, [visitasDoDia]);

  // Pré-marcar clientes já no roteiro ao abrir modal
  useEffect(() => {
    if (modalVisitas) {
      setClientesSelecionados(visitasDoDia.map(v => v.id));
    }
  }, [modalVisitas]);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase.from('customers').select('*');
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert('Erro', `Falha ao carregar clientes: ${(error as any)?.message || 'erro desconhecido'}`);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      email: '',
      cpf_cnpj: '',
      address: '',
      city: '',
      state: '',
      zipcode: '',
      notes: '',
    });
    setEditingId(null);
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setForm({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        cpf_cnpj: customer.cpf_cnpj || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        zipcode: customer.zipcode || '',
        notes: customer.notes || '',
      });
      setEditingId(customer.id);
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('customers')
          .update(form)
          .eq('id', editingId);
        if (error) throw error;
        Alert.alert('Sucesso', 'Cliente atualizado');
      } else {
        const { error } = await supabase.from('customers').insert([form]);
        if (error) throw error;
        Alert.alert('Sucesso', 'Cliente criado');
      }
      setModalVisible(false);
      loadCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      Alert.alert('Erro', `Falha ao salvar cliente: ${(error as any)?.message || 'erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
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
              .eq('id', customerId)
              .select();
            if (error) {
              if (error.code === '23503') {
                Alert.alert('Não foi possível excluir', 'Este cliente possui pedidos vinculados. Exclua os pedidos dele primeiro.');
                return;
              }
              throw error;
            }
            if (!data || data.length === 0) {
              console.error('Delete de customer não afetou nenhuma linha (RLS ou permissão):', customerId);
              Alert.alert('Erro', 'Não foi possível excluir: sem permissão para esta ação. Verifique a política de acesso no Supabase.');
              return;
            }
            setCustomers(prev => prev.filter(c => c.id !== customerId));
          } catch (e: any) {
            console.error('Erro ao excluir cliente:', e);
            Alert.alert('Erro', `Não foi possível excluir o cliente: ${e?.message || 'erro desconhecido'}`);
          }
        },
      },
    ]);
  };

  const handleOpenMap = (address: string, city: string) => {
    if (!address || !city) {
      Alert.alert('Aviso', 'Endereço incompleto');
      return;
    }
    const url = `https://www.google.com/maps/search/${encodeURIComponent(
      `${address}, ${city}`
    )}`;
    Linking.openURL(url);
  };

  const fetchZipCode = async (zipcode: string) => {
    const cleaned = zipcode.replace(/\D/g, '');
    if (cleaned.length < 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await response.json();

      if (data.erro) {
        Alert.alert('Aviso', 'CEP não encontrado');
        return;
      }

      setForm(prev => ({
        ...prev,
        address: data.logradouro || prev.address,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
    } catch (error) {
      console.error('Error fetching zipcode:', error);
    }
  };

  const handleImportFromContacts = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Indisponível', 'Importar contato só funciona no aplicativo instalado, não no navegador.');
      return;
    }
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Não foi possível acessar a agenda de contatos.');
        return;
      }
      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return;
      const phone = contact.phoneNumbers && contact.phoneNumbers.length > 0
        ? contact.phoneNumbers[0].number
        : '';
      const email = contact.emails && contact.emails.length > 0
        ? contact.emails[0].email
        : '';
      setForm(prev => ({
        ...prev,
        name: contact.name || prev.name,
        phone: phone || prev.phone,
        email: email || prev.email,
      }));
    } catch (error: any) {
      console.error('Erro ao importar contato:', error);
      Alert.alert('Erro', error?.message || 'Não foi possível importar o contato.');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // ===== Visitas do Dia functions =====

  const clienteTemEndereco = (cliente: Customer): boolean => {
    return !!(cliente.address && cliente.address.trim());
  };

  const montarEnderecoCompleto = (cliente: Customer): string => {
    if (cliente.address) return cliente.address;
    return '';
  };

  const adicionarClienteAoRoteiro = (cliente: Customer) => {
    if (visitasDoDia.find(v => v.id === cliente.id)) {
      Alert.alert('Atenção', 'Este cliente já está no roteiro do dia.');
      return;
    }
    if (!clienteTemEndereco(cliente)) {
      Alert.alert('Atenção', 'Este cliente não tem endereço cadastrado.');
      return;
    }

    const visita: VisitaDoDia = {
      id: cliente.id,
      nome: cliente.name,
      telefone: cliente.phone || '',
      endereco: montarEnderecoCompleto(cliente),
      cep: cliente.zipcode || '',
      ordem: visitasDoDia.length + 1,
      visitado: false,
    };

    setVisitasDoDia(prev => [...prev, visita]);
  };

  const toggleClienteRoteiro = (cliente: Customer) => {
    const jaSelecionado = clientesSelecionados.includes(cliente.id);

    if (jaSelecionado) {
      setClientesSelecionados(prev => prev.filter(id => id !== cliente.id));
    } else {
      if (!clienteTemEndereco(cliente)) {
        Alert.alert('Sem endereço', 'Este cliente não tem endereço cadastrado.');
        return;
      }
      setClientesSelecionados(prev => [...prev, cliente.id]);
    }
  };

  const confirmarSelecao = async () => {
    const novasVisitas: VisitaDoDia[] = customers
      .filter(c => clientesSelecionados.includes(c.id))
      .map((c, index) => ({
        id: c.id,
        nome: c.name,
        telefone: c.phone || '',
        endereco: montarEnderecoCompleto(c),
        cep: c.zipcode || '',
        ordem: index + 1,
        visitado: visitasDoDia.find(v => v.id === c.id)?.visitado || false,
      }));

    setVisitasDoDia(novasVisitas);
    try {
      await AsyncStorage.setItem('visitas_do_dia', JSON.stringify(novasVisitas));
    } catch (error) {
      console.error('Erro ao salvar visitas:', error);
    }
    setModalVisitas(false);
  };

  const marcarVisitado = (id: string) => {
    setVisitasDoDia(prev =>
      prev.map(v => (v.id === id ? { ...v, visitado: !v.visitado } : v))
    );
  };

  const handleRemoverVisita = async (visitaId: string) => {
    Alert.alert(
      'Remover',
      'Remover este cliente do roteiro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            setVisitasDoDia(prev => {
              const novas = prev.filter(v => v.id !== visitaId);
              AsyncStorage.setItem('visitas_do_dia', JSON.stringify(novas)).catch(e =>
                console.error('Erro ao salvar visitas_do_dia:', e)
              );
              return novas;
            });
          },
        },
      ]
    );
  };

  const handleLimparRoteiro = async () => {
    Alert.alert(
      'Limpar Roteiro',
      'Remover todos os clientes do roteiro do dia?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            setVisitasDoDia([]);
            await AsyncStorage.setItem('visitas_do_dia', JSON.stringify([]));
          },
        },
      ]
    );
  };

  const handleAbrirRotaGoogleMaps = async () => {
    if (!visitasDoDia || visitasDoDia.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos um cliente ao roteiro.');
      return;
    }

    const visitasComEndereco = visitasDoDia.filter(v =>
      v.endereco && v.endereco.trim() !== ''
    );

    if (visitasComEndereco.length === 0) {
      Alert.alert('Atenção', 'Nenhum cliente possui endereço cadastrado.');
      return;
    }

    try {
      let origemParam = '';

      if (Location) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          origemParam = `${loc.coords.latitude},${loc.coords.longitude}`;
        }
      }

      const enderecosCodificados = visitasComEndereco.map(v =>
        encodeURIComponent(v.endereco.trim())
      );

      const destino = enderecosCodificados[enderecosCodificados.length - 1];
      const waypoints = enderecosCodificados.slice(0, -1);

      let url = `https://www.google.com/maps/dir/?api=1`;
      if (origemParam) url += `&origin=${origemParam}`;
      url += `&destination=${destino}`;
      if (waypoints.length > 0) url += `&waypoints=${waypoints.join('|')}`;
      url += `&travelmode=driving`;

      await Linking.openURL(url);
    } catch (error) {
      // Fallback sem localização
      try {
        const enderecosCodificados = visitasDoDia
          .filter(v => v.endereco)
          .map(v => encodeURIComponent(v.endereco.trim()));

        const destino = enderecosCodificados[enderecosCodificados.length - 1];
        const waypoints = enderecosCodificados.slice(0, -1);

        let url = `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`;
        if (waypoints.length > 0) url += `&waypoints=${waypoints.join('|')}`;

        await Linking.openURL(url);
      } catch (e) {
        Alert.alert('Erro', 'Não foi possível abrir o Google Maps.');
      }
    }
  };

  const clientesFiltradosVisitas = customers.filter(c =>
    c.name.toLowerCase().includes(searchVisitas.toLowerCase())
  );

  const renderCardVisita = (visita: VisitaDoDia, index: number) => (
    <View
      style={[
        styles.visitaCard,
        {
          backgroundColor: visita.visitado ? '#F0F0F0' : '#FFFFFF',
          borderLeftColor: visita.visitado ? '#888888' : '#C9A96E',
        },
      ]}>
      <View style={styles.visitaOrdemCircle}>
        <Text style={styles.visitaOrdemText}>{index + 1}</Text>
      </View>

      <View style={styles.visitaInfo}>
        <Text
          style={[
            styles.visitaNome,
            { textDecorationLine: visita.visitado ? 'line-through' : 'none' },
          ]}>
          {visita.nome}
        </Text>
        <Text style={styles.visitaDetalhe}>{visita.endereco}</Text>
        {visita.telefone ? <Text style={styles.visitaDetalhe}>{visita.telefone}</Text> : null}
      </View>

      <View style={styles.visitaAcoes}>
        <TouchableOpacity onPress={() => marcarVisitado(visita.id)}>
          <Ionicons
            name={visita.visitado ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={visita.visitado ? '#4CAF50' : '#C9A96E'}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleRemoverVisita(visita.id)}>
          <Ionicons name="trash-outline" size={20} color="#FF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Clientes</Text>
      </View>

      {/* Abas */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tab,
            abaAtiva === 'Clientes' && styles.tabActive,
          ]}
          onPress={() => setAbaAtiva('Clientes')}>
          <Text
            style={[
              styles.tabText,
              abaAtiva === 'Clientes' && styles.tabTextActive,
            ]}>
            Clientes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            abaAtiva === 'Visitas do Dia' && styles.tabActive,
          ]}
          onPress={() => setAbaAtiva('Visitas do Dia')}>
          <Text
            style={[
              styles.tabText,
              abaAtiva === 'Visitas do Dia' && styles.tabTextActive,
            ]}>
            Visitas do Dia
          </Text>
        </TouchableOpacity>
      </View>

      {abaAtiva === 'Clientes' ? (
        <>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={themeColors.text.secondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar cliente..."
              placeholderTextColor={themeColors.text.disabled}
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          <FlatList
            style={{ flex: 1 }}
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.customerCard}>
                <View style={styles.customerInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                  </View>
                  <View style={styles.details}>
                    <Text style={styles.name}>{item.name}</Text>
                    {item.phone && <Text style={styles.detail}>{item.phone}</Text>}
                    {item.email && <Text style={styles.detail}>{item.email}</Text>}
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() => handleOpenMap(item.address, item.city)}
                    style={styles.actionBtn}>
                    <Ionicons name="location" size={18} color={themeColors.primary.dark} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleOpenModal(item)}
                    style={styles.actionBtn}>
                    <Ionicons name="pencil" size={18} color={themeColors.primary.dark} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteCustomer(item.id)}
                    style={styles.actionBtn}>
                    <Ionicons name="trash" size={18} color={themeColors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Nenhum cliente encontrado</Text>
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          <TouchableOpacity
            style={styles.fab}
            onPress={() => handleOpenModal()}>
            <Ionicons name="add" size={28} color={themeColors.white} />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <ScrollView
            style={styles.visitasScroll}
            contentContainerStyle={styles.visitasListContent}
            showsVerticalScrollIndicator={false}>
            {visitasDoDia.length === 0 ? (
              <View style={styles.visitasEmpty}>
                <Ionicons name="navigate-outline" size={48} color="#C9A96E" />
                <Text style={styles.visitasEmptyTitle}>Nenhuma visita programada</Text>
                <Text style={styles.visitasEmptyText}>
                  Toque em "Adicionar Cliente" para montar seu roteiro do dia.
                </Text>
              </View>
            ) : (
              visitasDoDia.map((visita, index) => renderCardVisita(visita, index))
            )}
          </ScrollView>

          {/* Botão + Adicionar Cliente */}
          {abaAtiva === 'Visitas do Dia' && (
            <TouchableOpacity
              style={styles.fabVisitas}
              onPress={() => setModalVisitas(true)}>
              <Ionicons name="add" size={28} color="#FFFFFF" />
              <Text style={styles.fabVisitasText}>Adicionar Cliente</Text>
            </TouchableOpacity>
          )}

          {/* Rodapé fixo */}
          <View
            style={[
              styles.visitasFooter,
              { paddingBottom: insets.bottom + 16 || 16 },
            ]}>
            <Text style={styles.visitasContador}>
              {visitasDoDia.filter(v => v.visitado).length} de {visitasDoDia.length} clientes visitados
            </Text>

            <TouchableOpacity
              onPress={handleAbrirRotaGoogleMaps}
              style={styles.visitasBtnRota}>
              <Ionicons name="navigate" size={20} color="#FFF" />
              <Text style={styles.visitasBtnRotaText}>Abrir Rota no Google Maps</Text>
            </TouchableOpacity>

            {visitasDoDia.length > 0 && (
              <TouchableOpacity
                onPress={handleLimparRoteiro}
                style={styles.visitasBtnLimpar}>
                <Text style={styles.visitasBtnLimparText}>Limpar Roteiro do Dia</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* Modal de Cliente */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingId ? 'Editar Cliente' : 'Novo Cliente'}
              </Text>
              {Platform.OS === 'web' ? (
                <View />
              ) : (
                <TouchableOpacity onPress={handleImportFromContacts} style={{ padding: 4 }}>
                  <Ionicons name="people" size={24} color={themeColors.primary.dark} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.formContainer}>
              {/* Form Fields */}
              <TextInput
                style={styles.input}
                placeholder="Nome *"
                placeholderTextColor={themeColors.text.disabled}
                value={form.name}
                onChangeText={(text) => setForm({ ...form, name: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Celular"
                placeholderTextColor={themeColors.text.disabled}
                value={form.phone}
                onChangeText={(text) => setForm({ ...form, phone: text })}
                keyboardType="phone-pad"
              />

              <TextInput
                style={styles.input}
                placeholder="E-mail"
                placeholderTextColor={themeColors.text.disabled}
                value={form.email}
                onChangeText={(text) => setForm({ ...form, email: text })}
                keyboardType="email-address"
              />

              <TextInput
                style={styles.input}
                placeholder="CPF/CNPJ"
                placeholderTextColor={themeColors.text.disabled}
                value={form.cpf_cnpj}
                onChangeText={(text) => setForm({ ...form, cpf_cnpj: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="CEP"
                placeholderTextColor={themeColors.text.disabled}
                value={form.zipcode}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\D/g, '');
                  setForm({ ...form, zipcode: text });
                  if (cleaned.length === 8) {
                    fetchZipCode(cleaned);
                  }
                }}
                onBlur={() => fetchZipCode(form.zipcode)}
                keyboardType="number-pad"
                maxLength={9}
              />

              <TextInput
                style={styles.input}
                placeholder="Endereço"
                placeholderTextColor={themeColors.text.disabled}
                value={form.address}
                onChangeText={(text) => setForm({ ...form, address: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Cidade"
                placeholderTextColor={themeColors.text.disabled}
                value={form.city}
                onChangeText={(text) => setForm({ ...form, city: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="UF"
                placeholderTextColor={themeColors.text.disabled}
                value={form.state}
                onChangeText={(text) => setForm({ ...form, state: text.toUpperCase() })}
                maxLength={2}
              />

              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Observações"
                placeholderTextColor={themeColors.text.disabled}
                value={form.notes}
                onChangeText={(text) => setForm({ ...form, notes: text })}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={loading}>
                <Text style={styles.saveButtonText}>
                  {loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de Selecionar Cliente para Visitas */}
      <Modal visible={modalVisitas} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisitas(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Adicionar Cliente ao Roteiro</Text>
              <View />
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={themeColors.text.secondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar cliente..."
                placeholderTextColor={themeColors.text.disabled}
                value={searchVisitas}
                onChangeText={setSearchVisitas}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
              {clientesFiltradosVisitas.length === 0 ? (
                <Text style={styles.emptyText}>Nenhum cliente encontrado</Text>
              ) : (
                clientesFiltradosVisitas.map(cliente => {
                  const temEndereco = clienteTemEndereco(cliente);
                  const selecionado = clientesSelecionados.includes(cliente.id);

                  return (
                    <TouchableOpacity
                      key={cliente.id}
                      style={[
                        styles.visitaSelectCard,
                        !temEndereco && styles.visitaSelectCardDisabled,
                      ]}
                      onPress={() => toggleClienteRoteiro(cliente)}>
                      <View style={styles.customerInfo}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{getInitials(cliente.name)}</Text>
                        </View>
                        <View style={styles.details}>
                          <Text style={styles.name}>{cliente.name}</Text>
                          {temEndereco ? (
                            <Text style={styles.detail} numberOfLines={2}>
                              {cliente.address}
                              {cliente.city ? `, ${cliente.city}` : ''}
                            </Text>
                          ) : (
                            <Text style={styles.detailSemEndereco}>Sem endereço</Text>
                          )}
                          {cliente.phone ? (
                            <Text style={styles.detail}>{cliente.phone}</Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={{ justifyContent: 'center' }}>
                        {selecionado ? (
                          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        ) : temEndereco ? (
                          <Ionicons name="ellipse-outline" size={24} color="#C9A96E" />
                        ) : (
                          <Ionicons name="alert-circle-outline" size={22} color="#FF4444" />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={confirmarSelecao}
              style={styles.confirmarSelecaoBtn}>
              <Text style={styles.confirmarSelecaoText}>Confirmar Seleção</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: typeof lightColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  // ===== Abas =====
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E3DC',
    backgroundColor: '#FFFFFF',
  },
  tab: {
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#C9A96E',
  },
  tabText: {
    color: '#5C3D1E',
    fontSize: 15,
  },
  tabTextActive: {
    color: '#C9A96E',
    fontSize: 15,
    fontWeight: 'bold',
  },
  // ===== Clientes (existente) =====
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text.primary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  detail: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: colors.text.disabled,
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    zIndex: 999,
    opacity: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  closeButton: {
    fontSize: 24,
    color: colors.text.primary,
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  importBtn: {
    display: 'none',
  },
  importBtnText: {
    display: 'none',
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    fontSize: 14,
    color: colors.text.primary,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.primary.dark,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  // ===== Visitas do Dia =====
  visitasScroll: {
    flex: 1,
  },
  visitasListContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingBottom: 240,
  },
  visitasEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  visitasEmptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5C3D1E',
    marginTop: 12,
  },
  visitasEmptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    maxWidth: '100%',
  },
  visitaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginVertical: 6,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  visitaOrdemCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#C9A96E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  visitaOrdemText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  visitaInfo: {
    flex: 1,
  },
  visitaNome: {
    fontWeight: 'bold',
    color: '#5C3D1E',
    fontSize: 15,
  },
  visitaDetalhe: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  visitaAcoes: {
    alignItems: 'center',
    gap: 8,
  },
  fabVisitas: {
    position: 'absolute',
    bottom: 200,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#C9A96E',
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 18,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    zIndex: 999,
  },
  fabVisitasText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  visitasFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0E8D8',
    gap: 10,
  },
  visitasContador: {
    textAlign: 'center',
    color: '#888',
    fontSize: 13,
  },
  visitasBtnRota: {
    backgroundColor: '#C9A96E',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  visitasBtnRotaText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  visitasBtnLimpar: {
    borderWidth: 1,
    borderColor: '#FF4444',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  visitasBtnLimparText: {
    color: '#FF4444',
    fontSize: 14,
  },
  // Modal selecionar cliente
  visitaSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  visitaSelectCardDisabled: {
    borderColor: '#FFCCCC',
    backgroundColor: '#FFF5F5',
  },
  detailSemEndereco: {
    fontSize: 12,
    color: '#FF4444',
    marginTop: 2,
    fontWeight: '600',
  },
  confirmarSelecaoBtn: {
    backgroundColor: '#C9A96E',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    margin: 16,
  },
  confirmarSelecaoText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
