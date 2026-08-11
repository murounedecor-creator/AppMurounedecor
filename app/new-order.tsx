import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import { colors } from '@/constants/colors';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { supabase, Customer, Product } from '@/lib/supabase';
import { scheduleOrderReminder, cancelOrderReminder } from '@/lib/notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ImagePicker = Platform.OS !== 'web' ? require('expo-image-picker') : null;
const Print = Platform.OS !== 'web' ? require('expo-print') : null;
const Sharing = Platform.OS !== 'web' ? require('expo-sharing') : null;
const DateTimePicker = Platform.OS !== 'web'
  ? require('@react-native-community/datetimepicker').default
  : () => null;

interface OrderFurniture {
  id: string;
  furnitureType: string;
  quantityPieces: number;
  widthM: string;
  depthM: string;
  heightM: string;
  calculatedMeters: number;
  photoBase64: string | null;
  retractable: boolean;
  places: number;
  seatCushions: number;
  backrestCushions: number;
  decorative: number;
  observations: string;
}

interface OrderService {
  id: string;
  name: string;
  value: string;
  quantity: string;
  unit: string;
  isChargeable: boolean;
}

interface CatalogService {
  id: string;
  nome: string;
  valor: number;
  unidade: string;
}

interface OrderProduct {
  id: string;
  productId: string | null;
  productName: string;
  meters: string;
  pricePerMeter: string;
  valorCusto: string;
  subtotal: number;
  quantity: string;
  unit: string;
}

interface OrderExpense {
  id: string;
  name: string;
  value: string;
  category: string;
  isPaid: boolean;
  isChargeable: boolean;
  expenseDate: string;
}

const FURNITURE_TYPES = [
  'SOFÁ',
  'POLTRONA',
  'CADEIRA',
  'CHAISE',
  'PUFE',
  'ALMOFADA',
  'CABECEIRA',
];

const UNIT_OPTIONS = [
  'Unitário',
  'Metro Linear',
  'Metro Quadrado',
  'Quilograma',
  'Litro',
  'Hora',
  'Diária',
  'Semana',
];

const UNIT_TO_SHORT: Record<string, string> = {
  'Unitário': 'un',
  'Metro Linear': 'm',
  'Metro Quadrado': 'm2',
  'Quilograma': 'kg',
  'Litro': 'lt',
  'Hora': 'h',
  'Diária': 'd',
  'Semana': 'sem',
};

const SHORT_TO_UNIT: Record<string, string> = {
  'un': 'Unitário',
  'm': 'Metro Linear',
  'm2': 'Metro Quadrado',
  'kg': 'Quilograma',
  'lt': 'Litro',
  'h': 'Hora',
  'd': 'Diária',
  'sem': 'Semana',
};

const EXPENSE_CATEGORIES = [
  { value: 'helpers', label: 'Ajudantes', icon: 'people' },
  { value: 'food', label: 'Alimentação', icon: 'restaurant' },
  { value: 'fuel', label: 'Combustível', icon: 'car' },
  { value: 'tools', label: 'Ferramentas', icon: 'hammer' },
  { value: 'accommodation', label: 'Hospedagem', icon: 'bed' },
  { value: 'taxes', label: 'Impostos', icon: 'document' },
  { value: 'leisure', label: 'Lazer', icon: 'happy' },
  { value: 'materials', label: 'Materiais', icon: 'cube' },
  { value: 'accounts', label: 'Contas', icon: 'cash' },
  { value: 'transport', label: 'Transporte', icon: 'bus' },
  { value: 'shipping', label: 'Frete', icon: 'plane' },
  { value: 'other', label: 'Outros', icon: 'ellipsis-horizontal' },
];

const formatarMetragem = (valor: number | undefined | null): string => {
  return Number(valor || 0).toFixed(2);
};

export default function NewOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editOrderNumber, setEditOrderNumber] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderDate, setOrderDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prazoEntrega, setPrazoEntrega] = useState<Date | null>(null);
  const [showPrazoPicker, setShowPrazoPicker] = useState(false);
  const [lembreteDiasAntes, setLembreteDiasAntes] = useState('');

  // Furniture section
  const [furnitures, setFurnitures] = useState<OrderFurniture[]>([]);
  const [editingFurnitureId, setEditingFurnitureId] = useState<string | null>(null);
  const [furnitureModal, setFurnitureModal] = useState(false);
  const [currentFurniture, setCurrentFurniture] = useState<Partial<OrderFurniture>>({
    id: '',
    furnitureType: 'SOFÁ',
    quantityPieces: 1,
    widthM: '',
    depthM: '',
    heightM: '',
    calculatedMeters: 0,
    photoBase64: null,
    retractable: false,
    places: 2,
    seatCushions: 0,
    backrestCushions: 0,
    decorative: 0,
    observations: '',
  });

  // Services section
  const [services, setServices] = useState<OrderService[]>([]);
  const [serviceModal, setServiceModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [currentService, setCurrentService] = useState<Partial<OrderService>>({
    id: '',
    name: '',
    value: '',
    quantity: '',
    unit: 'Unitário',
    isChargeable: true,
  });
  const [serviceTab, setServiceTab] = useState<'novo' | 'catalogo'>('novo');
  const [serviceSaveToCatalog, setServiceSaveToCatalog] = useState(false);
  const [catalogServices, setCatalogServices] = useState<CatalogService[]>([]);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string | null>(null);

  const SERVICE_CATEGORIES = ['Estofamento', 'Confecção de Capa', 'Cabeceira', 'Cortina', 'Outros'];

  const buildFurnitureDescription = (item: OrderFurniture): string => {
    const parts: string[] = [item.furnitureType];
    if (item.quantityPieces > 1) parts.push(`${item.quantityPieces}x`);
    if (item.places > 0) parts.push(`${item.places} lugares`);
    if (item.seatCushions > 0) parts.push(`${item.seatCushions} almofadas no assento`);
    if (item.backrestCushions > 0) parts.push(`${item.backrestCushions} almofadas no encosto`);
    if (item.decorative > 0) parts.push(`${item.decorative} almofadas decorativas`);

    const measures: string[] = [];
    if (item.widthM) measures.push(`${item.widthM.replace('.', ',')}m de largura`);
    if (item.depthM) measures.push(`${item.depthM.replace('.', ',')}m de profundidade`);
    if (item.heightM) measures.push(`${item.heightM.replace('.', ',')}m de altura`);

    return [parts.join(', '), measures.join(', ')].filter(Boolean).join(', ');
  };

  const handlePullFromFurniture = (item: OrderFurniture) => {
    const description = buildFurnitureDescription(item);
    setCurrentService(prev => ({
      ...prev,
      name: prev.name ? `${prev.name}, ${description}` : description,
    }));
  };

  // Products section
  const [orderProducts, setOrderProducts] = useState<OrderProduct[]>([]);
  const [productModal, setProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [currentProduct, setCurrentProduct] = useState<Partial<OrderProduct>>({
    id: '',
    productId: null,
    productName: '',
    meters: '',
    pricePerMeter: '',
    valorCusto: '',
    quantity: '',
    unit: 'Unitário',
    subtotal: 0,
  });
  const [productTab, setProductTab] = useState<'novo' | 'catalogo'>('novo');
  const [productSaveToCatalog, setProductSaveToCatalog] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);

  // Expenses section
  const [expenses, setExpenses] = useState<OrderExpense[]>([]);
  const [expenseModal, setExpenseModal] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<Partial<OrderExpense>>({
    id: '',
    name: '',
    value: '',
    category: 'materials',
    isPaid: false,
    isChargeable: false,
    expenseDate: format(new Date(), 'yyyy-MM-dd'),
  });

  // Discount section
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');

  // Freight
  const [freight, setFreight] = useState('');

  // Payment section
  const [paymentMethod, setPaymentMethod] = useState('Cartão de Crédito');
  const [paymentCondition, setPaymentCondition] = useState('À vista');
  const [observations, setObservations] = useState('');

  // Modal selectors
  const [customerSearchModal, setCustomerSearchModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  useEffect(() => {
    loadData();
    loadCatalogs();
  }, []);

  useEffect(() => {
    if (params?.pedidoId && params?.modo === 'edicao') {
      const carregarPedido = async () => {
        try {
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select('*, customer:customers(*)')
            .eq('id', params.pedidoId)
            .single();

          if (orderError || !orderData) {
            console.error('Erro ao carregar pedido:', orderError);
            return;
          }

          setSelectedCustomer(orderData.customer as Customer);
          setStatus(orderData.status || 'pending');
          setFreight(orderData.freight?.toString() || '0');
          setDiscountValue(orderData.discount_value?.toString() || '0');
          setDiscountType((orderData.discount_type as 'percentage' | 'fixed') || 'percentage');
          setPaymentMethod(orderData.payment_method || 'Cartão de Crédito');
          setPaymentCondition(orderData.payment_condition || 'À vista');
          setObservations(orderData.observations || '');
          setEditOrderId(orderData.id);
          setEditMode(true);
          setEditOrderNumber(orderData.number);
          setPrazoEntrega(orderData.prazo_entrega ? new Date(`${orderData.prazo_entrega}T09:00:00`) : null);
          setLembreteDiasAntes(orderData.lembrete_dias_antes?.toString() || '1');

          const [furnRes, servRes, prodRes, expRes] = await Promise.all([
            supabase.from('order_items_furniture').select('*').eq('order_id', params.pedidoId),
            supabase.from('order_items_services').select('*').eq('order_id', params.pedidoId),
            supabase.from('order_items_products').select('*').eq('order_id', params.pedidoId),
            supabase.from('order_expenses').select('*').eq('order_id', params.pedidoId),
          ]);

          if (furnRes.data) {
            setFurnitures(furnRes.data.map((f: any) => ({
              id: f.id,
              furnitureType: f.furniture_type,
              quantityPieces: f.quantity_pieces,
              widthM: f.width_m?.toString() || '',
              depthM: f.depth_m?.toString() || '',
              heightM: f.height_m?.toString() || '',
              calculatedMeters: f.calculated_meters,
              photoBase64: f.photo_base64,
              retractable: f.retractable,
              places: f.places,
              seatCushions: f.seat_cushions,
              backrestCushions: f.backrest_cushions,
              decorative: f.decorative,
              observations: f.observations,
            })));
          }

          if (servRes.data) {
            setServices(servRes.data.map((s: any) => ({
              id: s.id,
              name: s.service_name,
              value: (s.value / (s.quantity || 1)).toString(),
              quantity: s.quantity?.toString() || '1',
              unit: s.unit || 'Unitário',
              isChargeable: s.is_chargeable,
            })));
          }

          if (prodRes.data) {
            setOrderProducts(prodRes.data.map((p: any) => ({
              id: p.id,
              productId: p.product_id,
              productName: p.product_name,
              meters: p.meters?.toString() || '0',
              pricePerMeter: p.price_per_meter?.toString() || '0',
              valorCusto: p.valor_custo?.toString() || '0',
              subtotal: p.subtotal,
              quantity: p.quantity?.toString() || '1',
              unit: p.unit || 'Unitário',
            })));
          }

          if (expRes.data) {
            setExpenses(expRes.data.map((e: any) => ({
              id: e.id,
              name: e.name,
              value: e.value?.toString() || '0',
              category: e.category,
              isPaid: e.is_paid,
              isChargeable: e.is_chargeable,
              expenseDate: e.expense_date,
            })));
          }
        } catch (error) {
          console.error('Erro ao carregar pedido para edição:', error);
        }
      };
      carregarPedido();
    }
  }, [params?.pedidoId]);

  const loadCatalogs = async () => {
    try {
      const servicesData = await AsyncStorage.getItem('catalogo_servicos');
      if (servicesData) setCatalogServices(JSON.parse(servicesData));
    } catch (e) {
      console.error('Error loading catalogs:', e);
    }
  };

  const parseQuantidade = (val: string | number | undefined): number => {
    return parseFloat(String(val || '1').replace(',', '.')) || 1;
  };

  const saveServiceToCatalog = async (service: CatalogService) => {
    try {
      const existingData = await AsyncStorage.getItem('catalogo_servicos');
      const catalogo = existingData ? JSON.parse(existingData) : [];
      const novoItem = { ...service, id: Date.now().toString() };
      catalogo.push(novoItem);
      await AsyncStorage.setItem('catalogo_servicos', JSON.stringify(catalogo));
      setCatalogServices(catalogo);
    } catch (error) {
      console.error('Erro ao salvar no catálogo:', error);
    }
  };

  const saveProductToCatalog = async (product: {
    nome: string;
    valorVenda: number;
    valorCusto: number;
    unidade: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: product.nome,
          code: Date.now().toString(),
          sale_price_per_unit: product.valorVenda,
          cost_price_per_unit: product.valorCusto,
          unit_type: UNIT_TO_SHORT[product.unidade] || 'un',
          images: [],
        }])
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        Alert.alert('Erro', 'Falha ao salvar produto no catálogo: nenhum registro retornado');
        return;
      }

      setCatalogProducts(prev => [...prev, data[0] as Product]);
    } catch (error) {
      console.error('Erro ao salvar produto no catálogo:', error);
      Alert.alert('Erro', 'Falha ao salvar produto no catálogo: ' + (error as any)?.message);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [customersRes, productsRes] = await Promise.all([
        supabase.from('customers').select('*'),
        supabase.from('products').select('*'),
      ]);

      setCustomers((customersRes.data || []) as Customer[]);
      setProducts((productsRes.data || []) as Product[]);
      setCatalogProducts((productsRes.data || []) as Product[]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Erro', 'Falha ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // ============== DATE PICKER ==============
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setOrderDate(selectedDate);
    }
  };

  const handlePrazoChange = (event: any, selectedDate?: Date) => {
    setShowPrazoPicker(false);
    if (selectedDate) {
      setPrazoEntrega(selectedDate);
    }
  };

  // ============== FURNITURE FUNCTIONS ==============
  const parseNum = (val: string | undefined) =>
    parseFloat((val || '0').replace(',', '.')) || 0;

  const calculateFurnitureMeters = (furniture: Partial<OrderFurniture>) => {
    const width = parseNum(furniture.widthM);
    const depth = parseNum(furniture.depthM);
    const pieces = furniture.quantityPieces || 1;

    if (!width || !depth) return 0;

    let base = 0;
    switch (furniture.furnitureType) {
      case 'SOFÁ':
        base = width * 3 + depth * 2;
        break;
      case 'POLTRONA':
        base = width * 2.5 + depth * 1.5;
        break;
      case 'CHAISE':
        base = width * 2.5 + depth * 2;
        break;
      default:
        base = width * depth * 2;
        break;
    }
    return base * 1.2 * pieces;
  };

  const handleCalculateFurnitureMeters = () => {
    setCurrentFurniture(prev => {
      const calculated = calculateFurnitureMeters(prev);
      return { ...prev, calculatedMeters: calculated };
    });
  };

  const handleAddPhoto = async () => {
    if (Platform.OS === 'web' || !ImagePicker) {
      Alert.alert('Aviso', 'Seleção de fotos não disponível na web');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        base64: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setCurrentFurniture(prev => ({
          ...prev,
          photoBase64: base64,
        }));
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao selecionar foto');
    }
  };

  const handleSaveFurniture = () => {
    if (!currentFurniture.furnitureType) {
      Alert.alert('Erro', 'Selecione um tipo de móvel');
      return;
    }

    const finalQuantityPieces = currentFurniture.quantityPieces && currentFurniture.quantityPieces > 0
      ? currentFurniture.quantityPieces
      : 1;

    if (editingFurnitureId) {
      setFurnitures(prev =>
        prev.map(f =>
          f.id === editingFurnitureId
            ? { ...currentFurniture, quantityPieces: finalQuantityPieces } as OrderFurniture
            : f
        )
      );
    } else {
      setFurnitures(prev => [
        ...prev,
        {
          ...currentFurniture,
          quantityPieces: finalQuantityPieces,
          id: Date.now().toString(),
        } as OrderFurniture,
      ]);
    }

    setFurnitureModal(false);
    resetFurnitureForm();
  };

  const resetFurnitureForm = () => {
    setCurrentFurniture({
      id: '',
      furnitureType: 'SOFÁ',
      quantityPieces: 1,
      widthM: '',
      depthM: '',
      heightM: '',
      calculatedMeters: 0,
      photoBase64: null,
      retractable: false,
      places: 2,
      seatCushions: 0,
      backrestCushions: 0,
      decorative: 0,
      observations: '',
    });
    setEditingFurnitureId(null);
  };

  const handleEditFurniture = (furniture: OrderFurniture) => {
    setCurrentFurniture(furniture);
    setEditingFurnitureId(furniture.id);
    setFurnitureModal(true);
  };

  const handleDeleteFurniture = (id: string) => {
    setFurnitures(prev => prev.filter(f => f.id !== id));
  };

  // ============== SERVICE FUNCTIONS ==============
  const handleAddService = async () => {
    if (!currentService.name || !currentService.value) {
      Alert.alert('Erro', 'Preencha nome e valor do serviço');
      return;
    }

    const finalServiceName = selectedServiceCategory
      ? `${selectedServiceCategory} - ${currentService.name}`
      : currentService.name;

    const quantity = parseQuantidade(currentService.quantity);
    const unitValue = parseNum(currentService.value);

    if (editingServiceId) {
      setServices(prev =>
        prev.map(s =>
          s.id === editingServiceId
            ? {
                ...s,
                ...currentService,
                name: finalServiceName,
                quantity: String(quantity),
              } as OrderService
            : s
        )
      );
      setEditingServiceId(null);
    } else {
      setServices(prev => [
        ...prev,
        {
          ...currentService,
          name: finalServiceName,
          id: Date.now().toString(),
          quantity: String(quantity),
        } as OrderService,
      ]);
    }

    if (serviceSaveToCatalog) {
      await saveServiceToCatalog({
        id: Date.now().toString(),
        nome: finalServiceName,
        valor: unitValue,
        unidade: currentService.unit || 'Unitário',
      });
      setServiceSaveToCatalog(false);
    }

    setServiceModal(false);
    setCurrentService({
      id: '',
      name: '',
      value: '',
      quantity: '',
      unit: 'Unitário',
      isChargeable: true,
    });
    setServiceTab('novo');
    setSelectedServiceCategory(null);
  };

  const handleSelectCatalogService = (catService: CatalogService) => {
    setCurrentService({
      id: Date.now().toString(),
      name: catService.nome,
      value: catService.valor.toString(),
      quantity: '1',
      unit: catService.unidade,
      isChargeable: true,
    });
    setServiceTab('novo');
  };

  const handleDeleteService = (id: string) => {
    setServices(prev => prev.filter(s => s.id !== id));
  };

  // ============== PRODUCT FUNCTIONS ==============
  const handleAddProduct = async () => {
    if (!currentProduct.productName || !currentProduct.pricePerMeter) {
      Alert.alert('Erro', 'Preencha nome e valor de venda do produto');
      return;
    }

    const quantity = parseQuantidade(currentProduct.quantity);
    const subtotal = quantity * parseNum(currentProduct.pricePerMeter);

    if (editingProductId) {
      setOrderProducts(prev =>
        prev.map(p =>
          p.id === editingProductId
            ? {
                ...p,
                ...currentProduct,
                quantity: String(quantity),
                subtotal,
              } as OrderProduct
            : p
        )
      );
      setEditingProductId(null);
    } else {
      setOrderProducts(prev => [
        ...prev,
        {
          ...currentProduct,
          id: Date.now().toString(),
          quantity: String(quantity),
          subtotal,
        } as OrderProduct,
      ]);
    }

    if (productSaveToCatalog) {
      await saveProductToCatalog({
        nome: currentProduct.productName || '',
        valorVenda: parseNum(currentProduct.pricePerMeter),
        valorCusto: parseNum(currentProduct.valorCusto || '0'),
        unidade: currentProduct.unit || 'Unitário',
      });
      setProductSaveToCatalog(false);
    }

    setProductModal(false);
    setCurrentProduct({
      id: '',
      productId: null,
      productName: '',
      meters: '',
      pricePerMeter: '',
      valorCusto: '',
      quantity: '',
      unit: 'Unitário',
      subtotal: 0,
    });
    setProductTab('novo');
  };

  const handleSelectCatalogProduct = (catProduct: Product) => {
    setCurrentProduct({
      id: Date.now().toString(),
      productId: catProduct.id,
      productName: catProduct.name,
      meters: '',
      pricePerMeter: catProduct.sale_price_per_unit.toString(),
      valorCusto: catProduct.cost_price_per_unit.toString(),
      quantity: '',
      unit: SHORT_TO_UNIT[catProduct.unit_type] || 'Unitário',
      subtotal: 0,
    });
    setProductTab('novo');
  };

  const handleDeleteProduct = (id: string) => {
    setOrderProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleEditService = (service: OrderService) => {
    setEditingServiceId(service.id);
    setSelectedServiceCategory(null);
    setCurrentService({
      ...service,
      value: service.value,
      quantity: service.quantity || '1',
      unit: service.unit || 'Unitário',
    });
    setServiceModal(true);
  };

  const handleEditProduct = (product: OrderProduct) => {
    setEditingProductId(product.id);
    setCurrentProduct({
      ...product,
      meters: product.meters || '0',
      pricePerMeter: product.pricePerMeter || '0',
      valorCusto: product.valorCusto || '0',
      quantity: product.quantity || '1',
      unit: product.unit || 'Unitário',
    });
    setProductModal(true);
  };

  // ============== EXPENSE FUNCTIONS ==============
  const handleAddExpense = () => {
    if (!currentExpense.name || !currentExpense.value) {
      Alert.alert('Erro', 'Preencha nome e valor da despesa');
      return;
    }

    setExpenses(prev => [
      ...prev,
      {
        ...currentExpense,
        id: Date.now().toString(),
      } as OrderExpense,
    ]);

    setExpenseModal(false);
    setCurrentExpense({
      id: '',
      name: '',
      value: '',
      category: 'materials',
      isPaid: false,
      isChargeable: false,
      expenseDate: format(new Date(), 'yyyy-MM-dd'),
    });
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // ============== CALCULATIONS ==============
  const serviceSubtotal = services.reduce(
    (sum, s) => sum + (parseNum(s.value) * parseQuantidade(s.quantity)),
    0
  );

  const productSubtotal = orderProducts.reduce((sum, p) => sum + p.subtotal, 0);

  const chargeableExpenses = expenses
    .filter(e => e.isChargeable)
    .reduce((sum, e) => sum + parseNum(e.value), 0);

  const freightValue = parseNum(freight);

  let discountAmount = 0;
  if (discountValue) {
    if (discountType === 'percentage') {
      discountAmount =
        ((serviceSubtotal + productSubtotal + chargeableExpenses) *
          parseNum(discountValue)) /
        100;
    } else {
      discountAmount = parseNum(discountValue);
    }
  }

  const total =
    serviceSubtotal + productSubtotal + chargeableExpenses + freightValue - discountAmount;

  // ============== SAVE ORDER ==============
  const handleSaveOrder = async (silent: boolean = false): Promise<string | null> => {
    if (!selectedCustomer) {
      Alert.alert('Erro', 'Selecione um cliente');
      return null;
    }

    if (furnitures.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos um móvel');
      return null;
    }

    setSaving(true);
    try {
      const orderPayload = {
        customer_id: selectedCustomer.id,
        status,
        order_date: format(orderDate, 'yyyy-MM-dd'),
        service_subtotal: serviceSubtotal,
        product_subtotal: productSubtotal,
        expenses_total: chargeableExpenses,
        freight: freightValue,
        discount_type: discountType,
        discount_value: discountAmount,
        total,
        payment_method: paymentMethod,
        payment_condition: paymentCondition,
        observations,
        prazo_entrega: prazoEntrega ? format(prazoEntrega, 'yyyy-MM-dd') : null,
        lembrete_dias_antes: parseInt(lembreteDiasAntes || '1', 10) || 1,
      };

      let orderId: string;
      let orderNumber: string;
      let previousNotificationId: string | null = null;

      if (editMode && editOrderId) {
        orderId = editOrderId;
        orderNumber = editOrderNumber;

        const { data: prevOrder } = await supabase
          .from('orders')
          .select('notification_id')
          .eq('id', editOrderId)
          .maybeSingle();
        previousNotificationId = prevOrder?.notification_id ?? null;

        if (previousNotificationId) {
          await cancelOrderReminder(previousNotificationId);
        }

        const { error: updateError } = await supabase
          .from('orders')
          .update({ ...orderPayload, notification_id: null })
          .eq('id', editOrderId);

        if (updateError) throw updateError;

        await supabase.from('order_items_furniture').delete().eq('order_id', editOrderId);
        await supabase.from('order_items_services').delete().eq('order_id', editOrderId);
        await supabase.from('order_items_products').delete().eq('order_id', editOrderId);
        await supabase.from('order_expenses').delete().eq('order_id', editOrderId);
      } else {
        const lastOrder = await supabase
          .from('orders')
          .select('number')
          .order('created_at', { ascending: false })
          .limit(1);

        let nextNumber = '0001';
        if (lastOrder.data && lastOrder.data.length > 0) {
          const lastNumber = parseInt(lastOrder.data[0].number.split('-')[0]);
          nextNumber = (lastNumber + 1).toString().padStart(4, '0');
        }

        const year = format(new Date(), 'yy');
        orderNumber = `${nextNumber}-${year}`;

        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert([{ ...orderPayload, number: orderNumber }])
          .select()
          .single();

        if (orderError) throw orderError;
        orderId = orderData.id;
      }

      for (const furniture of furnitures) {
        const { error: furnitureError } = await supabase.from('order_items_furniture').insert([
          {
            order_id: orderId,
            furniture_type: furniture.furnitureType,
            quantity_pieces: furniture.quantityPieces,
            width_m: furniture.widthM ? parseNum(furniture.widthM) : null,
            depth_m: furniture.depthM ? parseNum(furniture.depthM) : null,
            height_m: furniture.heightM ? parseNum(furniture.heightM) : null,
            calculated_meters: furniture.calculatedMeters,
            photo_base64: furniture.photoBase64,
            retractable: furniture.retractable,
            places: furniture.places,
            seat_cushions: furniture.seatCushions,
            backrest_cushions: furniture.backrestCushions,
            decorative: furniture.decorative,
            observations: furniture.observations,
          },
        ]);
        if (furnitureError) {
          console.error('Erro ao salvar móvel:', furnitureError);
          throw new Error('Falha ao salvar móvel: ' + furnitureError.message);
        }
      }

      for (const service of services) {
        const { error: serviceError } = await supabase.from('order_items_services').insert([
          {
            order_id: orderId,
            service_name: service.name,
            value: parseNum(service.value) * parseQuantidade(service.quantity),
            is_chargeable: service.isChargeable,
            quantity: parseQuantidade(service.quantity),
            unit: service.unit || 'Unitário',
          },
        ]);
        if (serviceError) {
          console.error('Erro ao salvar serviço:', serviceError);
          throw new Error('Falha ao salvar serviço: ' + serviceError.message);
        }
      }

      for (const product of orderProducts) {
        const { error: productError } = await supabase.from('order_items_products').insert([
          {
            order_id: orderId,
            product_id: product.productId,
            product_name: product.productName,
            meters: parseNum(product.meters || '0'),
            price_per_meter: parseNum(product.pricePerMeter),
            valor_custo: parseNum(product.valorCusto || '0'),
            subtotal: product.subtotal,
            quantity: parseQuantidade(product.quantity),
            unit: product.unit || 'Unitário',
          },
        ]);
        if (productError) {
          console.error('Erro ao salvar produto:', productError);
          throw new Error('Falha ao salvar produto: ' + productError.message);
        }
      }

      for (const expense of expenses) {
        const { error: expenseError } = await supabase.from('order_expenses').insert([
          {
            order_id: orderId,
            name: expense.name,
            value: parseNum(expense.value),
            category: expense.category,
            is_paid: expense.isPaid,
            is_chargeable: expense.isChargeable,
            expense_date: expense.expenseDate,
          },
        ]);
        if (expenseError) {
          console.error('Erro ao salvar despesa:', expenseError);
          throw new Error('Falha ao salvar despesa: ' + expenseError.message);
        }
      }

      let novoNotificationId: string | null = null;
      if (status === 'in_progress' && prazoEntrega) {
        novoNotificationId = await scheduleOrderReminder(
          orderId,
          selectedCustomer.name,
          format(prazoEntrega, 'yyyy-MM-dd'),
          parseInt(lembreteDiasAntes || '1', 10) || 1
        );
        if (novoNotificationId) {
          await supabase
            .from('orders')
            .update({ notification_id: novoNotificationId })
            .eq('id', orderId);
        }
      }

      if (!silent) {
        Alert.alert('Sucesso', `Pedido ${orderNumber} ${editMode ? 'atualizado' : 'criado'} com sucesso!`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
      return orderId;
    } catch (error: any) {
      console.error('Error saving order:', error);
      Alert.alert('Erro', error?.message || 'Falha ao salvar pedido');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedCustomer) {
      Alert.alert('Atenção', 'Selecione um cliente antes de gerar o PDF');
      return;
    }
    const savedOrderId = await handleSaveOrder(true);
    if (!savedOrderId) {
      return;
    }
    try {
      const orderNumber = editMode ? editOrderNumber : format(new Date(), 'yyMM') + '-' + Date.now().toString().slice(-4);
      const furnitureHtml = furnitures.map(f => {
        let details = `<div style="margin-bottom:10px; font-size:12px;">`;
        details += `<strong>${f.furnitureType}${f.places ? ` - ${f.places} lugares` : ''}${f.retractable ? ' - Retrátil' : ''}</strong><br>`;
        details += `Medidas: ${f.widthM || 0}m × ${f.depthM || 0}m × ${f.heightM || 0}m<br>`;
        if (f.seatCushions && f.seatCushions > 0) details += `Almofadas no Assento: ${f.seatCushions} unidades<br>`;
        if (f.backrestCushions && f.backrestCushions > 0) details += `Almofadas no Encosto: ${f.backrestCushions} unidades<br>`;
        if (f.observations) details += `Outros: ${f.observations}<br>`;
        details += `Metragem estimada: ${formatarMetragem(f.calculatedMeters)} metros`;
        details += `</div>`;
        return details;
      }).join('');

      const serviceRows = services.map(s => {
        const qty = parseQuantidade(s.quantity);
        const unitVal = parseNum(s.value);
        const svcTotal = qty * unitVal;
        return `<tr><td>${s.name}</td><td>${qty}</td><td>${s.unit || 'un'}</td><td>R$ ${unitVal.toFixed(2).replace('.', ',')}</td><td>R$ ${svcTotal.toFixed(2).replace('.', ',')}</td></tr>`;
      }).join('');

      const productRows = orderProducts.map(p => {
        const qty = parseQuantidade(p.quantity);
        const unitVal = parseNum(p.pricePerMeter);
        const prodTotal = qty * unitVal;
        return `<tr><td>${p.productName}</td><td>${qty}</td><td>${p.unit || 'un'}</td><td>R$ ${unitVal.toFixed(2).replace('.', ',')}</td><td>R$ ${prodTotal.toFixed(2).replace('.', ',')}</td></tr>`;
      }).join('');

      const expenseRows = expenses.map(e =>
        `<tr><td>${e.name}</td><td>${e.category || ''}</td><td>${e.expenseDate || ''}</td><td>R$ ${parseNum(e.value).toFixed(2).replace('.', ',')}</td></tr>`
      ).join('');

      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
    .header { border-bottom: 2px solid #C9A96E; padding-bottom: 10px; margin-bottom: 20px; }
    .empresa { font-size: 22px; font-weight: bold; color: #5C3D1E; }
    .email { font-size: 12px; color: #888; }
    .numero { font-size: 14px; font-weight: bold; color: #5C3D1E; text-align: right; }
    .watermark {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80px; font-weight: bold;
      color: rgba(201,169,110,0.06);
      white-space: nowrap; z-index: 0; pointer-events: none;
    }
    h3 { color: #5C3D1E; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th { background: #F5F0E8; color: #5C3D1E; padding: 6px; text-align: left; font-size: 12px; }
    td { padding: 6px; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
    .total-row { font-weight: bold; color: #5C3D1E; }
    .totais { margin-top: 20px; }
    .totais table td { border: none; }
    .total-final { font-size: 16px; font-weight: bold; color: #5C3D1E; border-top: 2px solid #C9A96E !important; }
    .pagamento { margin-top: 15px; }
    .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="watermark">MUROUNE DECOR</div>
  <div class="header">
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <div class="empresa">Muroune Decor</div>
        <div class="email">murounedecor@gmail.com</div>
      </div>
      <div style="text-align:right;">
        <div class="numero">ORÇAMENTO Nº ${orderNumber}</div>
        <div style="font-size:11px; color:#888;">Data: ${format(orderDate, 'dd/MM/yyyy')}</div>
      </div>
    </div>
  </div>
  <h3>Dados do Cliente</h3>
  <p style="font-size:13px; margin:2px 0;">${selectedCustomer.name || ''}</p>
  <p style="font-size:12px; color:#666; margin:2px 0;">Tel.: ${selectedCustomer.phone || ''}</p>
  ${selectedCustomer.address ? `<p style="font-size:12px; color:#666; margin:2px 0;">${selectedCustomer.address}</p>` : ''}
  ${furnitures.length > 0 ? `
  <h3>Móveis / Projeto</h3>
  ${furnitureHtml}
  ` : ''}
  ${services.length > 0 ? `
  <h3>Serviços</h3>
  <table>
    <tr><th>Nome</th><th>Qtd</th><th>Unidade</th><th>Vlr Unit.</th><th>Vlr Total</th></tr>
    ${serviceRows}
    <tr class="total-row"><td colspan="4">Total Serviços</td><td>R$ ${serviceSubtotal.toFixed(2).replace('.', ',')}</td></tr>
  </table>
  ` : ''}
  ${orderProducts.length > 0 ? `
  <h3>Produtos</h3>
  <table>
    <tr><th>Nome</th><th>Qtd</th><th>Unidade</th><th>Vlr Unit.</th><th>Vlr Total</th></tr>
    ${productRows}
    <tr class="total-row"><td colspan="4">Total Produtos</td><td>R$ ${productSubtotal.toFixed(2).replace('.', ',')}</td></tr>
  </table>
  ` : ''}
  ${expenses.length > 0 ? `
  <h3>Despesas</h3>
  <table>
    <tr><th>Nome</th><th>Tipo</th><th>Data</th><th>Valor</th></tr>
    ${expenseRows}
    <tr class="total-row"><td colspan="3">Total Despesas</td><td>R$ ${chargeableExpenses.toFixed(2).replace('.', ',')}</td></tr>
  </table>
  ` : ''}
  <div class="totais">
    <h3>Totais</h3>
    <table>
      ${serviceSubtotal > 0 ? `<tr><td>Subtotal Serviços</td><td style="text-align:right">R$ ${serviceSubtotal.toFixed(2).replace('.', ',')}</td></tr>` : ''}
      ${productSubtotal > 0 ? `<tr><td>Subtotal Produtos</td><td style="text-align:right">R$ ${productSubtotal.toFixed(2).replace('.', ',')}</td></tr>` : ''}
      ${chargeableExpenses > 0 ? `<tr><td>Despesas Cobráveis</td><td style="text-align:right">R$ ${chargeableExpenses.toFixed(2).replace('.', ',')}</td></tr>` : ''}
      ${freightValue > 0 ? `<tr><td>Frete</td><td style="text-align:right">R$ ${freightValue.toFixed(2).replace('.', ',')}</td></tr>` : ''}
      ${discountAmount > 0 ? `<tr><td>Desconto</td><td style="text-align:right">-R$ ${discountAmount.toFixed(2).replace('.', ',')}</td></tr>` : ''}
      <tr class="total-final"><td><strong>TOTAL</strong></td><td style="text-align:right"><strong>R$ ${total.toFixed(2).replace('.', ',')}</strong></td></tr>
    </table>
  </div>
  <div class="pagamento">
    <h3>Pagamento</h3>
    <p style="font-size:12px;">Forma: <strong>${paymentMethod || ''}</strong></p>
    <p style="font-size:12px;">Condição: <strong>${paymentCondition || ''}</strong></p>
  </div>
  ${observations ? `
  <h3>Observações</h3>
  <p style="font-size:12px;">${observations}</p>
  ` : ''}
  <div class="footer">MUROUNE DECOR | murounedecor@gmail.com</div>
</body>
</html>`;

      if (Platform.OS === 'web') {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        return;
      }
      if (!Print) {
        Alert.alert('Aviso', 'Geração de PDF não disponível neste dispositivo.');
        return;
      }
      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });

      const nomeArquivo = `Orcamento-${orderNumber}.pdf`;
      if (Platform.OS !== 'web') {
        const { File, Paths } = require('expo-file-system');
        const sourceFile = new File(uri);
        const destFile = new File(Paths.document, nomeArquivo);
        if (destFile.exists) {
          destFile.delete();
        }
        sourceFile.move(destFile);

        await Sharing.shareAsync(destFile.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Compartilhar ${nomeArquivo}`,
          UTI: 'com.adobe.pdf',
        });

        Alert.alert('Sucesso', 'PDF enviado e pedido salvo com sucesso!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      Alert.alert('Erro ao gerar PDF', error?.message || 'Erro desconhecido. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary.dark} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.title}>{editMode ? `Editar Pedido ${editOrderNumber}` : 'Novo Pedido'}</Text>
          <View />
        </View>

        {/* CUSTOMER SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          {selectedCustomer ? (
            <View style={styles.selectedItem}>
              <Text style={styles.selectedItemText}>{selectedCustomer.name}</Text>
              <TouchableOpacity onPress={() => setCustomerSearchModal(true)}>
                <Ionicons name="create" size={20} color={colors.primary.dark} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setCustomerSearchModal(true)}>
              <Ionicons name="person" size={20} color={colors.primary.dark} />
              <Text style={styles.selectButtonText}>Selecionar Cliente</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* DATE AND STATUS */}
        <View style={styles.row}>
          <View style={[styles.section, styles.flex1]}>
            <Text style={styles.sectionTitle}>Data</Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={styles.dateButton}
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
                maxLength={10}
                value={format(orderDate, 'dd/MM/yyyy', { locale: ptBR })}
                onChangeText={texto => {
                  const partes = texto.split('/');
                  if (partes.length === 3 && partes[2]?.length === 4) {
                    const [dia, mes, ano] = partes.map(Number);
                    const data = new Date(ano, mes - 1, dia);
                    if (!isNaN(data.getTime())) {
                      setOrderDate(data);
                    }
                  }
                }}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}>
                  <Ionicons name="calendar" size={20} color={colors.primary.dark} />
                  <Text style={styles.dateButtonText}>
                    {format(orderDate, 'dd/MM/yyyy', { locale: ptBR })}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={orderDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    locale="pt-BR"
                  />
                )}
              </>
            )}
          </View>

          <View style={[styles.section, styles.flex1]}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.statusButtonGroup}>
              {['pending', 'in_progress', 'completed', 'cancelled'].map(st => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.statusSmallButton,
                    status === st && styles.statusSmallButtonActive,
                  ]}
                  onPress={() => setStatus(st)}>
                  <Text
                    style={[
                      styles.statusSmallButtonText,
                      status === st && styles.statusSmallButtonTextActive,
                    ]}>
                    {st === 'pending'
                      ? 'P'
                      : st === 'in_progress'
                        ? 'E'
                        : st === 'completed'
                          ? 'C'
                          : 'X'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* PRAZO DE ENTREGA E LEMBRETE */}
        <View style={styles.row}>
          <View style={[styles.section, styles.flex1]}>
            <Text style={styles.sectionTitle}>Prazo de Entrega</Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={styles.dateButton}
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
                maxLength={10}
                value={prazoEntrega ? format(prazoEntrega, 'dd/MM/yyyy', { locale: ptBR }) : ''}
                onChangeText={texto => {
                  const partes = texto.split('/');
                  if (partes.length === 3 && partes[2]?.length === 4) {
                    const [dia, mes, ano] = partes.map(Number);
                    const data = new Date(ano, mes - 1, dia);
                    if (!isNaN(data.getTime())) {
                      setPrazoEntrega(data);
                    }
                  }
                }}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowPrazoPicker(true)}>
                  <Ionicons name="calendar" size={20} color={colors.primary.dark} />
                  <Text style={styles.dateButtonText}>
                    {prazoEntrega
                      ? format(prazoEntrega, 'dd/MM/yyyy', { locale: ptBR })
                      : 'Sem prazo'}
                  </Text>
                </TouchableOpacity>
                {showPrazoPicker && (
                  <DateTimePicker
                    value={prazoEntrega || new Date()}
                    mode="date"
                    display="spinner"
                    onChange={handlePrazoChange}
                    locale="pt-BR"
                  />
                )}
              </>
            )}
          </View>

          <View style={[styles.section, styles.flex1]}>
            <Text style={styles.sectionTitle}>Avisar quantos dias antes</Text>
            <TextInput
              style={styles.dateButton}
              keyboardType="numeric"
              value={lembreteDiasAntes}
              onChangeText={txt => {
                const onlyNums = txt.replace(/[^0-9]/g, '');
                if (onlyNums === '') {
                  setLembreteDiasAntes('');
                  return;
                }
                const n = parseInt(onlyNums, 10);
                setLembreteDiasAntes(n < 0 ? '0' : String(n));
              }}
              placeholder="1"
              placeholderTextColor={colors.text.secondary}
            />
          </View>
        </View>

        {/* FURNITURE SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Móveis/Projeto</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                resetFurnitureForm();
                setFurnitureModal(true);
              }}>
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={styles.addButtonText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {furnitures.map(furniture => (
            <View key={furniture.id} style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <Text style={styles.itemCardTitle}>{furniture.furnitureType}</Text>
                <View style={styles.itemCardActions}>
                  <TouchableOpacity onPress={() => handleEditFurniture(furniture)}>
                    <Ionicons name="pencil" size={18} color={colors.primary.dark} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteFurniture(furniture.id)}>
                    <Ionicons name="trash" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
              {furniture.photoBase64 && (
                <Text style={styles.itemCardDetail}>📷 Foto anexada</Text>
              )}
              <Text style={styles.itemCardDetail}>
                Medidas: {furniture.widthM}m × {furniture.depthM}m × {furniture.heightM}m
              </Text>
              <Text style={styles.itemCardDetail}>Metragem: {formatarMetragem(furniture.calculatedMeters)}m²</Text>
            </View>
          ))}
        </View>

        {/* SERVICE SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Serviços</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setServiceModal(true)}>
              <Ionicons name="add" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>

          {services.map(service => (
            <View key={service.id} style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <View>
                  <Text style={styles.itemCardTitle}>{service.name}</Text>
                  <Text style={styles.itemCardDetail}>
                    {parseQuantidade(service.quantity)}x {service.unit || 'Unitário'} - R$ {(parseNum(service.value) * parseQuantidade(service.quantity)).toFixed(2).replace('.', ',')}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity onPress={() => handleEditService(service)} style={{ padding: 4 }}>
                    <Ionicons name="pencil-outline" size={18} color="#C9A96E" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteService(service.id)}>
                    <Ionicons name="trash" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          <Text style={styles.subtotal}>Subtotal: R$ {serviceSubtotal.toFixed(2).replace('.', ',')}</Text>
        </View>

        {/* PRODUCT SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Produtos</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setProductModal(true)}>
              <Ionicons name="add" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>

          {orderProducts.map(product => (
            <View key={product.id} style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <View>
                  <Text style={styles.itemCardTitle}>{product.productName}</Text>
                  <Text style={styles.itemCardDetail}>
                    {parseQuantidade(product.quantity)}x {product.unit || 'Unitário'} - R$ {product.subtotal.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity onPress={() => handleEditProduct(product)} style={{ padding: 4 }}>
                    <Ionicons name="pencil-outline" size={18} color="#C9A96E" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteProduct(product.id)}>
                    <Ionicons name="trash" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          <Text style={styles.subtotal}>Subtotal: R$ {productSubtotal.toFixed(2).replace('.', ',')}</Text>
        </View>

        {/* EXPENSES SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Despesas</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setExpenseModal(true)}>
              <Ionicons name="add" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>

          {expenses.map(expense => (
            <View key={expense.id} style={styles.itemCard}>
              <View style={styles.itemCardHeader}>
                <View>
                  <Text style={styles.itemCardTitle}>{expense.name}</Text>
                  <Text style={styles.itemCardDetail}>
                    {EXPENSE_CATEGORIES.find(c => c.value === expense.category)?.label} • R${' '}
                    {parseFloat(expense.value).toFixed(2).replace('.', ',')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteExpense(expense.id)}>
                  <Ionicons name="trash" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* FREIGHT SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frete</Text>
          <TextInput
            style={styles.input}
            placeholder="Valor do frete"
            placeholderTextColor={colors.text.disabled}
            value={freight}
            onChangeText={setFreight}
            keyboardType="decimal-pad"
          />
        </View>

        {/* DISCOUNT SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desconto</Text>
          <View style={styles.discountTypeButtons}>
            <TouchableOpacity
              style={[
                styles.discountTypeButton,
                discountType === 'percentage' && styles.discountTypeButtonActive,
              ]}
              onPress={() => setDiscountType('percentage')}>
              <Text
                style={[
                  styles.discountTypeButtonText,
                  discountType === 'percentage' && styles.discountTypeButtonTextActive,
                ]}>
                %
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.discountTypeButton,
                discountType === 'fixed' && styles.discountTypeButtonActive,
              ]}
              onPress={() => setDiscountType('fixed')}>
              <Text
                style={[
                  styles.discountTypeButtonText,
                  discountType === 'fixed' && styles.discountTypeButtonTextActive,
                ]}>
                R$
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder={`Desconto ${discountType === 'percentage' ? '(%)' : '(R$)'}`}
            placeholderTextColor={colors.text.disabled}
            value={discountValue}
            onChangeText={setDiscountValue}
            keyboardType="decimal-pad"
          />
          <View style={styles.discountSummary}>
            <Text style={styles.discountText}>
              Total anterior: R$ {(serviceSubtotal + productSubtotal + chargeableExpenses).toFixed(2).replace('.', ',')}
            </Text>
            <Text style={styles.discountText}>
              Desconto: R$ {discountAmount.toFixed(2).replace('.', ',')}
            </Text>
            <Text style={styles.discountText}>
              Novo total: R$ {(serviceSubtotal + productSubtotal + chargeableExpenses - discountAmount).toFixed(2).replace('.', ',')}
            </Text>
          </View>
        </View>

        {/* PAYMENT SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pagamento</Text>
          <Text style={styles.label}>Forma de Pagamento</Text>
          <View style={styles.paymentTypeGrid}>
            {[
              { id: 'Dinheiro', label: 'Dinheiro' },
              { id: 'Pix', label: 'Pix' },
              { id: 'Cartão Débito', label: 'Cartão Débito' },
              { id: 'Cartão Crédito', label: 'Cartão Crédito' },
              { id: 'Boleto', label: 'Boleto' },
              { id: 'Transferência', label: 'Transferência' },
            ].map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.paymentTypeBtn,
                  paymentMethod === type.id && styles.paymentTypeBtnActive,
                ]}
                onPress={() => setPaymentMethod(type.id)}>
                <Text
                  style={[
                    styles.paymentTypeBtnText,
                    paymentMethod === type.id && styles.paymentTypeBtnTextActive,
                  ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Condição de Pagamento</Text>
          <View style={styles.conditionGrid}>
            {[
              { id: 'avista', label: 'À Vista' },
              { id: 'metade50', label: '50% Entrada + 50% Entrega' },
              { id: 'entrada2x', label: '50% Entrada + 2x' },
            ].map(cond => (
              <TouchableOpacity
                key={cond.id}
                style={[
                  styles.conditionBtn,
                  paymentCondition === cond.label && styles.conditionBtnActive,
                ]}
                onPress={() => setPaymentCondition(cond.label)}>
                <Text
                  style={[
                    styles.conditionBtnText,
                    paymentCondition === cond.label && styles.conditionBtnTextActive,
                  ]}>
                  {cond.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Observações do pedido"
            placeholderTextColor={colors.text.disabled}
            value={observations}
            onChangeText={setObservations}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* TOTALS */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal Serviço</Text>
            <Text style={styles.totalValue}>R$ {serviceSubtotal.toFixed(2).replace('.', ',')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal Produto</Text>
            <Text style={styles.totalValue}>R$ {productSubtotal.toFixed(2).replace('.', ',')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Despesas Cobráveis</Text>
            <Text style={styles.totalValue}>R$ {chargeableExpenses.toFixed(2).replace('.', ',')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Frete</Text>
            <Text style={styles.totalValue}>R$ {freightValue.toFixed(2).replace('.', ',')}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Desconto</Text>
            <Text style={styles.totalValue}>-R$ {discountAmount.toFixed(2).replace('.', ',')}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowHighlight]}>
            <Text style={styles.totalLabelHighlight}>TOTAL</Text>
            <Text style={styles.totalValueHighlight}>R$ {total.toFixed(2).replace('.', ',')}</Text>
          </View>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSave]}
            onPress={() => handleSaveOrder()}
            disabled={saving}>
            <Ionicons name="save" size={20} color={colors.white} />
            <Text style={styles.buttonText}>{saving ? 'Salvando...' : 'Salvar Pedido'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.buttonPDF]} disabled={saving} onPress={handleGeneratePDF}>
            <Ionicons name="document" size={20} color={colors.white} />
            <Text style={styles.buttonText}>Enviar PDF</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ============== MODALS ============== */}

      {/* Customer Selection Modal */}
      <Modal visible={customerSearchModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <KeyboardAwareScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            enableOnAndroid
            extraScrollHeight={20}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setCustomerSearchModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Selecionar Cliente</Text>
              <View />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Buscar cliente..."
              placeholderTextColor={colors.text.disabled}
              value={customerSearch}
              onChangeText={setCustomerSearch}
            />

            {customers
              .filter(c =>
                c.name.toLowerCase().includes(customerSearch.toLowerCase())
              )
              .map(customer => (
                <TouchableOpacity
                  key={customer.id}
                  style={styles.modalOption}
                  onPress={() => {
                    setSelectedCustomer(customer);
                    setCustomerSearchModal(false);
                  }}>
                  <Text style={styles.modalOptionText}>{customer.name}</Text>
                  <Text style={styles.modalOptionDetail}>{customer.phone}</Text>
                </TouchableOpacity>
              ))}
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      {/* Furniture Modal */}
      <Modal visible={furnitureModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <KeyboardAwareScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
            extraScrollHeight={20}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setFurnitureModal(false);
                  resetFurnitureForm();
                }}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingFurnitureId ? 'Editar Móvel' : 'Adicionar Móvel'}
              </Text>
              <View />
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.label}>Tipo de Móvel</Text>
              <View style={styles.furnitureTypeButtons}>
                {FURNITURE_TYPES.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.furnitureTypeButton,
                      currentFurniture.furnitureType === type &&
                        styles.furnitureTypeButtonActive,
                    ]}
                    onPress={() =>
                      setCurrentFurniture(prev => ({
                        ...prev,
                        furnitureType: type,
                      }))
                    }>
                    <Text
                      style={[
                        styles.furnitureTypeButtonText,
                        currentFurniture.furnitureType === type &&
                          styles.furnitureTypeButtonTextActive,
                      ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(currentFurniture.furnitureType === 'SOFÁ' || currentFurniture.furnitureType === 'CHAISE') && (
                <>
                  {currentFurniture.furnitureType === 'SOFÁ' && (
                    <>
                      <Text style={styles.label}>Retrátil?</Text>
                      <View style={styles.toggleButtonGroup}>
                        <TouchableOpacity
                          style={[
                            styles.toggleButton,
                            currentFurniture.retractable && styles.toggleButtonActive,
                          ]}
                          onPress={() =>
                            setCurrentFurniture(prev => ({
                              ...prev,
                              retractable: true,
                            }))
                          }>
                          <Text
                            style={[
                              styles.toggleButtonText,
                              currentFurniture.retractable && styles.toggleButtonTextActive,
                            ]}>
                            Sim
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.toggleButton,
                            !currentFurniture.retractable && styles.toggleButtonActive,
                          ]}
                          onPress={() =>
                            setCurrentFurniture(prev => ({
                              ...prev,
                              retractable: false,
                            }))
                          }>
                          <Text
                            style={[
                              styles.toggleButtonText,
                              !currentFurniture.retractable && styles.toggleButtonTextActive,
                            ]}>
                            Não
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  <Text style={styles.label}>Lugares</Text>
                  <View style={styles.placesButtonsWrap}>
                    {[2, 3, 4, 5, 6, 7, 8].map(n => (
                      <TouchableOpacity
                        key={n}
                        style={[
                          styles.placeButton,
                          currentFurniture.places === n && styles.placeButtonActive,
                        ]}
                        onPress={() =>
                          setCurrentFurniture(prev => ({
                            ...prev,
                            places: n,
                          }))
                        }>
                        <Text
                          style={[
                            styles.placeButtonText,
                            currentFurniture.places === n &&
                              styles.placeButtonTextActive,
                          ]}>
                          {n}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {['SOFÁ', 'POLTRONA', 'CHAISE'].includes(currentFurniture.furnitureType || '') && (
                <>
                  <Text style={styles.label}>Almofadas no Assento</Text>
                  <View style={styles.quantityButtons}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <TouchableOpacity
                        key={n}
                        style={[
                          styles.quantityButton,
                          currentFurniture.seatCushions === n && styles.quantityButtonActive,
                        ]}
                        onPress={() =>
                          setCurrentFurniture(prev => ({
                            ...prev,
                            seatCushions: n,
                          }))
                        }>
                        <Text
                          style={[
                            styles.quantityButtonText,
                            currentFurniture.seatCushions === n &&
                              styles.quantityButtonTextActive,
                          ]}>
                          {n}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Almofadas no Encosto</Text>
                  <View style={styles.quantityButtons}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <TouchableOpacity
                        key={n}
                        style={[
                          styles.quantityButton,
                          currentFurniture.backrestCushions === n && styles.quantityButtonActive,
                        ]}
                        onPress={() =>
                          setCurrentFurniture(prev => ({
                            ...prev,
                            backrestCushions: n,
                          }))
                        }>
                        <Text
                          style={[
                            styles.quantityButtonText,
                            currentFurniture.backrestCushions === n &&
                              styles.quantityButtonTextActive,
                          ]}>
                          {n}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.label}>Outros</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Informações adicionais"
                    placeholderTextColor={colors.text.disabled}
                    value={currentFurniture.observations}
                    onChangeText={text =>
                      setCurrentFurniture(prev => ({
                        ...prev,
                        observations: text,
                      }))
                    }
                    multiline
                    numberOfLines={2}
                  />
                </>
              )}

              <Text style={styles.label}>Quantidade de Peças</Text>
              <TextInput
                style={styles.input}
                placeholder="Quantidade"
                placeholderTextColor={colors.text.disabled}
                value={currentFurniture.quantityPieces ? currentFurniture.quantityPieces.toString() : ''}
                onChangeText={text =>
                  setCurrentFurniture(prev => ({
                    ...prev,
                    quantityPieces: text === '' ? 0 : (parseInt(text) || 0),
                  }))
                }
                keyboardType="number-pad"
              />

              <Text style={styles.label}>Medidas (em metros)</Text>
              <TextInput
                style={styles.input}
                placeholder="Largura"
                placeholderTextColor={colors.text.disabled}
                value={currentFurniture.widthM}
                onChangeText={text =>
                  setCurrentFurniture(prev => ({
                    ...prev,
                    widthM: text,
                  }))
                }
                keyboardType="decimal-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Profundidade"
                placeholderTextColor={colors.text.disabled}
                value={currentFurniture.depthM}
                onChangeText={text =>
                  setCurrentFurniture(prev => ({
                    ...prev,
                    depthM: text,
                  }))
                }
                keyboardType="decimal-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Altura"
                placeholderTextColor={colors.text.disabled}
                value={currentFurniture.heightM}
                onChangeText={text =>
                  setCurrentFurniture(prev => ({
                    ...prev,
                    heightM: text,
                  }))
                }
                keyboardType="decimal-pad"
              />

              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={handleCalculateFurnitureMeters}>
                <Text style={styles.buttonSecondaryText}>Calcular Metragem</Text>
              </TouchableOpacity>

              {(currentFurniture.calculatedMeters ?? 0) > 0 && (
                <View style={styles.calcResultCard}>
                  <Text style={styles.calcResultLabel}>Consumo estimado de tecido:</Text>
                  <Text style={styles.calcResultValue}>
                    {formatarMetragem(currentFurniture.calculatedMeters)} metros
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleSaveFurniture}
                style={{
                  backgroundColor: '#C9A96E',
                  borderRadius: 8,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginTop: 12,
                  marginHorizontal: 0,
                }}>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>
                  Adicionar
                </Text>
              </TouchableOpacity>

              {!['SOFÁ', 'POLTRONA', 'CHAISE'].includes(currentFurniture.furnitureType || '') && (
                <>
                  <Text style={styles.label}>Observações</Text>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    placeholder="Observações do móvel"
                    placeholderTextColor={colors.text.disabled}
                    value={currentFurniture.observations}
                    onChangeText={text =>
                      setCurrentFurniture(prev => ({
                        ...prev,
                        observations: text,
                      }))
                    }
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={handleAddPhoto}>
                <Ionicons name="camera" size={20} color={colors.white} />
                <Text style={styles.buttonSecondaryText}>Tirar Foto</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.button} onPress={handleSaveFurniture}>
                <Text style={styles.buttonText}>
                  {editingFurnitureId ? 'Atualizar Móvel' : 'Adicionar Móvel'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      {/* Service Modal */}
      <Modal visible={serviceModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <KeyboardAwareScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
            extraScrollHeight={20}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setServiceModal(false);
                setServiceTab('novo');
              }}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Adicionar Serviço</Text>
              <View />
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, serviceTab === 'novo' && styles.tabButtonActive]}
                onPress={() => setServiceTab('novo')}>
                <Text style={[styles.tabText, serviceTab === 'novo' && styles.tabTextActive]}>Novo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, serviceTab === 'catalogo' && styles.tabButtonActive]}
                onPress={() => setServiceTab('catalogo')}>
                <Text style={[styles.tabText, serviceTab === 'catalogo' && styles.tabTextActive]}>Catálogo de Serviços</Text>
              </TouchableOpacity>
            </View>

            {serviceTab === 'novo' ? (
              <View style={styles.modalForm}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Salvar no Catálogo</Text>
                  <Switch
                    value={serviceSaveToCatalog}
                    onValueChange={setServiceSaveToCatalog}
                    trackColor={{ false: colors.border, true: colors.primary.light }}
                    thumbColor={serviceSaveToCatalog ? colors.primary.dark : colors.text.secondary}
                  />
                </View>

                {furnitures.length > 0 && (
                  <>
                    <Text style={styles.label}>Puxar dados de um Móvel/Projeto</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                      {furnitures.map(item => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.unitButton}
                          onPress={() => handlePullFromFurniture(item)}>
                          <Text style={styles.unitButtonText}>{item.furnitureType}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                <Text style={styles.label}>Nome do Serviço *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nome do serviço"
                  placeholderTextColor={colors.text.disabled}
                  value={currentService.name}
                  onChangeText={text =>
                    setCurrentService(prev => ({
                      ...prev,
                      name: text,
                    }))
                  }
                />

                <Text style={styles.label}>Categoria do Serviço</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {SERVICE_CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.unitButton,
                        selectedServiceCategory === cat && styles.unitButtonActive,
                      ]}
                      onPress={() => setSelectedServiceCategory(prev => (prev === cat ? null : cat))}>
                      <Text
                        style={[
                          styles.unitButtonText,
                          selectedServiceCategory === cat && styles.unitButtonTextActive,
                        ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Valor do Serviço (R$)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="R$ 0,00"
                  placeholderTextColor={colors.text.disabled}
                  value={currentService.value}
                  onChangeText={text =>
                    setCurrentService(prev => ({
                      ...prev,
                      value: text,
                    }))
                  }
                  keyboardType="decimal-pad"
                />

                <Text style={styles.label}>Unidade do Serviço</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                  {UNIT_OPTIONS.map(unit => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.unitButton,
                        currentService.unit === unit && styles.unitButtonActive,
                      ]}
                      onPress={() =>
                        setCurrentService(prev => ({
                          ...prev,
                          unit: unit,
                        }))
                      }>
                      <Text
                        style={[
                          styles.unitButtonText,
                          currentService.unit === unit && styles.unitButtonTextActive,
                        ]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.label}>Quantidade</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 0,80"
                  placeholderTextColor={colors.text.disabled}
                  value={currentService.quantity}
                  onChangeText={text => {
                    const cleaned = text.replace(/[^0-9.,]/g, '');
                    setCurrentService(prev => ({
                      ...prev,
                      quantity: cleaned,
                    }));
                  }}
                  keyboardType="decimal-pad"
                />

                <TouchableOpacity style={styles.addButtonLarge} onPress={handleAddService}>
                  <Text style={styles.addButtonLargeText}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.catalogList}>
                {catalogServices.length === 0 ? (
                  <Text style={styles.emptyCatalogText}>Nenhum serviço salvo no catálogo</Text>
                ) : (
                  catalogServices.map(service => (
                    <TouchableOpacity
                      key={service.id}
                      style={styles.catalogItem}
                      onPress={() => handleSelectCatalogService(service)}>
                      <Text style={styles.catalogItemName}>{service.nome}</Text>
                      <Text style={styles.catalogItemDetail}>
                        R$ {service.valor.toFixed(2).replace('.', ',')} | {service.unidade}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      {/* Product Modal */}
      <Modal visible={productModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <KeyboardAwareScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
            extraScrollHeight={20}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => {
                setProductModal(false);
                setProductTab('novo');
              }}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Adicionar Produto</Text>
              <View />
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, productTab === 'novo' && styles.tabButtonActive]}
                onPress={() => setProductTab('novo')}>
                <Text style={[styles.tabText, productTab === 'novo' && styles.tabTextActive]}>Novo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, productTab === 'catalogo' && styles.tabButtonActive]}
                onPress={() => setProductTab('catalogo')}>
                <Text style={[styles.tabText, productTab === 'catalogo' && styles.tabTextActive]}>Catálogo de Produtos</Text>
              </TouchableOpacity>
            </View>

            {productTab === 'novo' ? (
              <View style={styles.modalForm}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Salvar no Catálogo</Text>
                  <Switch
                    value={productSaveToCatalog}
                    onValueChange={setProductSaveToCatalog}
                    trackColor={{ false: colors.border, true: colors.primary.light }}
                    thumbColor={productSaveToCatalog ? colors.primary.dark : colors.text.secondary}
                  />
                </View>

                <Text style={styles.label}>Nome do Produto *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nome do produto"
                  placeholderTextColor={colors.text.disabled}
                  value={currentProduct.productName}
                  onChangeText={text =>
                    setCurrentProduct(prev => ({
                      ...prev,
                      productName: text,
                    }))
                  }
                />

                <Text style={styles.label}>Valor de Venda (R$)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="R$ 0,00"
                  placeholderTextColor={colors.text.disabled}
                  value={currentProduct.pricePerMeter}
                  onChangeText={text =>
                    setCurrentProduct(prev => ({
                      ...prev,
                      pricePerMeter: text,
                    }))
                  }
                  keyboardType="decimal-pad"
                />

                <Text style={styles.label}>Valor de Custo (R$)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="R$ 0,00"
                  placeholderTextColor={colors.text.disabled}
                  value={currentProduct.valorCusto}
                  onChangeText={text =>
                    setCurrentProduct(prev => ({
                      ...prev,
                      valorCusto: text,
                    }))
                  }
                  keyboardType="decimal-pad"
                />

                <Text style={styles.label}>Unidade de Venda</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                  {UNIT_OPTIONS.map(unit => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.unitButton,
                        currentProduct.unit === unit && styles.unitButtonActive,
                      ]}
                      onPress={() =>
                        setCurrentProduct(prev => ({
                          ...prev,
                          unit: unit,
                        }))
                      }>
                      <Text
                        style={[
                          styles.unitButtonText,
                          currentProduct.unit === unit && styles.unitButtonTextActive,
                        ]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.label}>Quantidade</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: 0,80"
                  placeholderTextColor={colors.text.disabled}
                  value={currentProduct.quantity}
                  onChangeText={text => {
                    const cleaned = text.replace(/[^0-9.,]/g, '');
                    setCurrentProduct(prev => ({
                      ...prev,
                      quantity: cleaned,
                    }));
                  }}
                  keyboardType="decimal-pad"
                />

                <TouchableOpacity style={styles.addButtonLarge} onPress={handleAddProduct}>
                  <Text style={styles.addButtonLargeText}>Adicionar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.catalogList}>
                {catalogProducts.length === 0 ? (
                  <Text style={styles.emptyCatalogText}>Nenhum produto salvo no catálogo</Text>
                ) : (
                  catalogProducts.map(product => (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.catalogItem}
                      onPress={() => handleSelectCatalogProduct(product)}>
                      <Text style={styles.catalogItemName}>{product.name}</Text>
                      <Text style={styles.catalogItemDetail}>
                        Venda: R$ {product.sale_price_per_unit.toFixed(2).replace('.', ',')} | {product.unit_type}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </KeyboardAwareScrollView>
        </View>
      </Modal>

      {/* Expense Modal */}
      <Modal visible={expenseModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <KeyboardAwareScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            enableOnAndroid
            extraScrollHeight={20}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setExpenseModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Adicionar Despesa</Text>
              <View />
            </View>

            <View style={styles.modalForm}>
              <TextInput
                style={styles.input}
                placeholder="Valor"
                placeholderTextColor={colors.text.disabled}
                value={currentExpense.value}
                onChangeText={text =>
                  setCurrentExpense(prev => ({
                    ...prev,
                    value: text,
                  }))
                }
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Categoria</Text>
              <View style={styles.categoryGrid}>
                {EXPENSE_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryButton,
                      currentExpense.category === cat.value &&
                        styles.categoryButtonActive,
                    ]}
                    onPress={() =>
                      setCurrentExpense(prev => ({
                        ...prev,
                        category: cat.value,
                        name: cat.label,
                      }))
                    }>
                    <Ionicons name={cat.icon as any} size={20} color={currentExpense.category === cat.value ? colors.white : colors.primary.dark} />
                    <Text style={[styles.categoryButtonText, currentExpense.category === cat.value && styles.categoryButtonTextActive]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.toggles}>
                <TouchableOpacity
                  style={styles.toggleOption}
                  onPress={() =>
                    setCurrentExpense(prev => ({
                      ...prev,
                      isPaid: !prev.isPaid,
                    }))
                  }>
                  <View
                    style={[
                      styles.checkbox,
                      currentExpense.isPaid && styles.checkboxActive,
                    ]}>
                    {currentExpense.isPaid && (
                      <Ionicons name="checkmark" size={16} color={colors.white} />
                    )}
                  </View>
                  <Text style={styles.toggleLabel}>Pago</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.toggleOption}
                  onPress={() =>
                    setCurrentExpense(prev => ({
                      ...prev,
                      isChargeable: !prev.isChargeable,
                    }))
                  }>
                  <View
                    style={[
                      styles.checkbox,
                      currentExpense.isChargeable && styles.checkboxActive,
                    ]}>
                    {currentExpense.isChargeable && (
                      <Ionicons name="checkmark" size={16} color={colors.white} />
                    )}
                  </View>
                  <Text style={styles.toggleLabel}>Cobrável</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={handleAddExpense}
                style={{
                  backgroundColor: '#C9A96E',
                  borderRadius: 8,
                  paddingVertical: 14,
                  alignItems: 'center',
                  marginTop: 16,
                  marginHorizontal: 0,
                }}>
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>
                  Adicionar Despesa
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: colors.primary.main,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
  },
  section: {
    marginHorizontal: 20,
    marginVertical: 12,
    paddingVertical: 12,
  },
  paymentTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  paymentTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  flexShrink: 1,
    borderWidth: 1.5,
    borderColor: colors.primary.main,
    borderRadius: 8,
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 12,
    opacity: 1,
  },
  paymentTypeBtnActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.dark,
  },
  paymentTypeIcon: {
    fontSize: 16,
  },
  paymentTypeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  paymentTypeBtnTextActive: {
    color: colors.white,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C9A96E',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  selectButtonText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  selectedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.primary.light,
    borderRadius: 8,
  },
  selectedItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  dateButtonText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600',
  },
  statusButtonGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  statusSmallButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusSmallButtonActive: {
    backgroundColor: colors.primary.dark,
    borderColor: colors.primary.dark,
  },
  statusSmallButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  statusSmallButtonTextActive: {
    color: colors.white,
  },
  itemCard: {
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  itemCardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  itemCardDetail: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  subtotal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary.dark,
    marginTop: 8,
    textAlign: 'right',
  },
  discountTypeButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  discountTypeButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountTypeButtonActive: {
    backgroundColor: colors.primary.dark,
    borderColor: colors.primary.dark,
  },
  discountTypeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  discountTypeButtonTextActive: {
    color: colors.white,
  },
  discountSummary: {
    padding: 10,
    backgroundColor: colors.surface,
    borderRadius: 6,
    marginTop: 10,
  },
  discountText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginVertical: 4,
  },
  totalsSection: {
    marginHorizontal: 20,
    marginVertical: 12,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  totalRowHighlight: {
    backgroundColor: colors.primary.main,
    paddingVertical: 12,
    marginHorizontal: -16,
    marginVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderBottomWidth: 0,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  totalLabelHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary.dark,
  },
  totalValueHighlight: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginVertical: 20,
    marginBottom: 40,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonSave: {
    backgroundColor: colors.status.completed,
  },
  buttonPDF: {
    backgroundColor: colors.primary.main,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  calcResultCard: {
    backgroundColor: colors.primary.light,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary.main,
    padding: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  calcResultLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  calcResultValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary.dark,
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.primary.main,
    borderRadius: 6,
    marginVertical: 8,
    gap: 6,
    opacity: 1,
  },
  buttonSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  furnitureTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  furnitureTypeButton: {
    width: '31%',
    paddingVertical: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  furnitureTypeButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.dark,
  },
  furnitureTypeButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
    textAlign: 'center',
  },
  furnitureTypeButtonTextActive: {
    color: colors.white,
  },
  toggleButtonGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.primary.dark,
    borderColor: colors.primary.dark,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  toggleButtonTextActive: {
    color: colors.white,
  },
  quantityButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  placesButtonsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  placeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C9A96E',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 3,
    backgroundColor: colors.white,
  },
  placeButtonActive: {
    backgroundColor: colors.primary.dark,
    borderColor: colors.primary.dark,
  },
  placeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5C3D1E',
  },
  placeButtonTextActive: {
    color: colors.white,
  },
  quantityButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonActive: {
    backgroundColor: colors.primary.dark,
    borderColor: colors.primary.dark,
  },
  quantityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  quantityButtonTextActive: {
    color: colors.white,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryButton: {
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: colors.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary.main,
    alignItems: 'center',
    gap: 4,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.dark,
  },
  categoryButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
  },
  categoryButtonTextActive: {
    color: colors.white,
  },
  toggles: {
    flexDirection: 'row',
    gap: 20,
    marginVertical: 12,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.status.completed,
    borderColor: colors.status.completed,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
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
  modalForm: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalOptionDetail: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  // New styles
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  tabButtonActive: {
    backgroundColor: colors.primary.main,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.white,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  horizontalScroll: {
    marginVertical: 8,
  },
  unitButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary.main,
    marginRight: 8,
  },
  unitButtonActive: {
    backgroundColor: colors.primary.dark,
    borderColor: colors.primary.dark,
  },
  unitButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.dark,
  },
  unitButtonTextActive: {
    color: colors.white,
  },
  addButtonLarge: {
    backgroundColor: colors.primary.main,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonLargeText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  catalogList: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  catalogItem: {
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  catalogItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  catalogItemDetail: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  emptyCatalogText: {
    fontSize: 14,
    color: colors.text.disabled,
    textAlign: 'center',
    paddingVertical: 40,
  },
  conditionGrid: {
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
  },
  conditionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexShrink: 1,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.primary.main,
    alignItems: 'center',
  },
  conditionBtnActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.dark,
  },
  conditionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.dark,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  conditionBtnTextActive: {
    color: colors.white,
  },
});
