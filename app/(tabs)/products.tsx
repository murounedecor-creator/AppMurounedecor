import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { colors } from '@/constants/colors';
import { supabase, Product } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const ImagePicker = Platform.OS !== 'web' ? require('expo-image-picker') : null;

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchText, setSearchText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const unitOptions = [
    { label: 'Unitário', value: 'un' },
    { label: 'Metro Linear', value: 'm' },
    { label: 'Metro Quadrado', value: 'm2' },
    { label: 'Quilograma', value: 'kg' },
    { label: 'Litro', value: 'lt' },
    { label: 'Hora', value: 'h' },
    { label: 'Diária', value: 'd' },
    { label: 'Semana', value: 'sem' },
  ];

  const [form, setForm] = useState({
    name: '',
    code: '',
    sale_price_per_unit: '',
    cost_price_per_unit: '',
    unit_type: 'un' as 'un' | 'h' | 'd' | 'm2' | 'm' | 'sem' | 'kg' | 'lt',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Erro', 'Falha ao carregar produtos');
    }
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setForm({
        name: product.name,
        code: product.code,
        sale_price_per_unit: product.sale_price_per_unit.toString(),
        cost_price_per_unit: product.cost_price_per_unit.toString(),
        unit_type: product.unit_type as 'un' | 'h' | 'd' | 'm2' | 'm' | 'sem' | 'kg' | 'lt',
      });
      setImages(product.images || []);
      setEditingId(product.id);
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const resetForm = () => {
    setForm({
      name: '',
      code: '',
      sale_price_per_unit: '',
      cost_price_per_unit: '',
      unit_type: 'un',
    });
    setImages([]);
    setEditingId(null);
  };

  const handleAddImage = async () => {
    if (Platform.OS === 'web' || !ImagePicker) {
      Alert.alert('Aviso', 'Seleção de fotos não disponível na web');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        base64: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setImages([...images, base64]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erro', 'Falha ao selecionar imagem');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      Alert.alert('Erro', 'Nome e Código são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: form.name,
        code: form.code,
        sale_price_per_unit: parseFloat(form.sale_price_per_unit) || 0,
        cost_price_per_unit: parseFloat(form.cost_price_per_unit) || 0,
        unit_type: form.unit_type,
        images,
      };

      if (editingId) {
        const { error } = await supabase.from('products').update(data).eq('id', editingId);
        if (error) throw error;
        Alert.alert('Sucesso', 'Produto atualizado');
      } else {
        const { error } = await supabase.from('products').insert([data]);
        if (error) throw error;
        Alert.alert('Sucesso', 'Produto criado');
      }
      setModalVisible(false);
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Erro', 'Falha ao salvar produto');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Excluir', 'Deseja excluir este produto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            loadProducts();
            Alert.alert('Sucesso', 'Produto excluído');
          } catch (error) {
            Alert.alert('Erro', 'Falha ao excluir');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Produtos</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar produto..."
          placeholderTextColor={colors.text.disabled}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={products.filter(p =>
          p.name.toLowerCase().includes(searchText.toLowerCase()) ||
          p.code.toLowerCase().includes(searchText.toLowerCase())
        )}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            {item.images && item.images.length > 0 && (
              <Image
                source={{ uri: item.images[0] }}
                style={styles.productImage}
              />
            )}
            <View style={styles.productInfo}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.code}>Código: {item.code}</Text>
              <Text style={styles.price}>
                Venda: R$ {item.sale_price_per_unit.toFixed(2).replace('.', ',')} / {item.unit_type}
              </Text>
              <Text style={styles.price}>
                Custo: R$ {item.cost_price_per_unit.toFixed(2).replace('.', ',')} / {item.unit_type}
              </Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleOpenModal(item)}>
                <Ionicons name="pencil" size={20} color={colors.primary.dark} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.fab} onPress={() => handleOpenModal()}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <KeyboardAwareScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
            extraScrollHeight={20}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingId ? 'Editar Produto' : 'Novo Produto'}
              </Text>
              <View />
            </View>

            <View style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nome *"
                placeholderTextColor={colors.text.disabled}
                value={form.name}
                onChangeText={(text) => setForm({ ...form, name: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Código *"
                placeholderTextColor={colors.text.disabled}
                value={form.code}
                onChangeText={(text) => setForm({ ...form, code: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Valor de Venda por Unidade"
                placeholderTextColor={colors.text.disabled}
                value={form.sale_price_per_unit}
                onChangeText={(text) =>
                  setForm({ ...form, sale_price_per_unit: text })
                }
                keyboardType="decimal-pad"
              />

              <TextInput
                style={styles.input}
                placeholder="Valor de Custo por Unidade"
                placeholderTextColor={colors.text.disabled}
                value={form.cost_price_per_unit}
                onChangeText={(text) =>
                  setForm({ ...form, cost_price_per_unit: text })
                }
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Unidade de Venda</Text>
              <View style={styles.unitGrid}>
                {unitOptions.map(unit => (
                  <TouchableOpacity
                    key={unit.value}
                    style={[
                      styles.unitButton,
                      form.unit_type === unit.value && styles.unitButtonActive,
                    ]}
                    onPress={() =>
                      setForm({ ...form, unit_type: unit.value as 'un' | 'h' | 'd' | 'm2' | 'm' | 'sem' | 'kg' | 'lt' })
                    }>
                    <Text
                      style={[
                        styles.unitButtonText,
                        form.unit_type === unit.value &&
                          styles.unitButtonTextActive,
                      ]}>
                      {unit.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, styles.labelMargin]}>Fotos</Text>
              <TouchableOpacity
                style={styles.addImageBtn}
                onPress={handleAddImage}>
                <Ionicons name="camera" size={20} color={colors.white} />
                <Text style={styles.addImageBtnText}>Adicionar Foto</Text>
              </TouchableOpacity>

              <View style={styles.imagesContainer}>
                {images.map((img, index) => (
                  <View key={index} style={styles.imageThumbnail}>
                    <Image source={{ uri: img }} style={styles.image} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => handleRemoveImage(index)}>
                      <Ionicons name="close" size={16} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={loading}>
                <Text style={styles.saveButtonText}>
                  {loading ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    marginHorizontal: 20,
    marginVertical: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.surface,
  },
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
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  productCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    backgroundColor: colors.border,
  },
  productInfo: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  code: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  price: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  labelMargin: {
    marginTop: 16,
  },
  unitGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitButton: {
    flex: 1,
    flexShrink: 1,
    minWidth: '45%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.primary.main,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  unitButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.dark,
  },
  unitButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    flexShrink: 1,
    flexWrap: 'wrap',
    textAlign: 'center',
  },
  unitButtonTextActive: {
    color: colors.white,
  },
  addImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.info,
    borderRadius: 8,
    gap: 8,
    marginVertical: 8,
  },
  addImageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  imageThumbnail: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
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
});
