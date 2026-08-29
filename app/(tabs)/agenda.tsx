import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
  Platform,
  Share,
} from 'react-native';
import { lightColors } from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase, Customer, CalendarEvent } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { LinearGradient } from 'expo-linear-gradient';
import {
  startOfMonth,
  endOfMonth,
  format,
  isSameDay,
  addMonths,
  subMonths,
  differenceInCalendarDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const EVENT_COLORS = ['#C9A96E', '#8B6914', '#00B341', '#0070F3', '#FF9500', '#F31260'];

export default function AgendaScreen() {
  const { themeColors } = useTheme();
  const styles = getStyles(themeColors);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showList, setShowList] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [eventTime, setEventTime] = useState('09:00');
  const [description, setDescription] = useState('');
  const [eventColor, setEventColor] = useState('#C9A96E');

  const [abaCalendario, setAbaCalendario] = useState<'visitar' | 'entregas' | 'compras'>('visitar');
  const [entregas, setEntregas] = useState<Array<{
    id: string;
    number: string;
    prazo_entrega: string;
    customer: { name: string } | null;
  }>>([]);
  const [compras, setCompras] = useState<Array<{
    nome: string;
    unidade: string;
    quantidadeTotal: number;
    comprado: boolean;
    orderIds: string[];
    itensPorPedido: Array<{ clienteNome: string; numeroPedido: string; quantidade: number }>;
  }>>([]);
  const [loadingEntregas, setLoadingEntregas] = useState(false);
  const [loadingCompras, setLoadingCompras] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [currentMonth]);

  useEffect(() => {
    if (abaCalendario === 'entregas') loadEntregas();
    if (abaCalendario === 'compras') loadCompras();
  }, [abaCalendario]);

  const loadCustomers = async () => {
    const { data } = await supabase.from('customers').select('*').order('name');
    if (data) setCustomers(data as Customer[]);
  };

  const loadEvents = async () => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('date', start)
      .lte('date', end)
      .order('date')
      .order('time');
    if (data) setEvents(data as CalendarEvent[]);
  };

  const loadEntregas = async () => {
    setLoadingEntregas(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, number, prazo_entrega, customer:customers(name)')
        .eq('status', 'in_progress')
        .not('prazo_entrega', 'is', null)
        .order('prazo_entrega', { ascending: true });
      if (error) throw error;
      setEntregas((data || []) as unknown as Array<{
        id: string;
        number: string;
        prazo_entrega: string;
        customer: { name: string } | null;
      }>);
    } catch (e) {
      console.error('Erro ao carregar entregas:', e);
      Alert.alert('Erro', `Não foi possível carregar as entregas: ${(e as any)?.message || 'erro desconhecido'}`);
    } finally {
      setLoadingEntregas(false);
    }
  };

  const loadCompras = async () => {
    setLoadingCompras(true);
    try {
      const { data, error } = await supabase
        .from('order_items_products')
        .select('id, order_id, product_name, quantity, unit, comprado, order:orders!inner(status, number, customer:customers(name))')
        .eq('order.status', 'in_progress')
        .eq('oculto_compras', false);
      if (error) throw error;
      const rows = (data || []) as unknown as Array<{
        id: string;
        order_id: string;
        product_name: string;
        quantity: number;
        unit: string;
        comprado: boolean;
        order: { status: string; number: string; customer: { name: string } | null };
      }>;

      const gruposMap = new Map<string, {
        nome: string;
        unidade: string;
        quantidadeTotal: number;
        comprado: boolean;
        orderIds: string[];
        itensPorPedido: Array<{ clienteNome: string; numeroPedido: string; quantidade: number }>;
      }>();

      for (const r of rows) {
        const key = `${r.product_name}__${r.unit}`;
        const itemPedido = {
          clienteNome: r.order?.customer?.name || 'Sem cliente',
          numeroPedido: r.order?.number || '—',
          quantidade: r.quantity,
        };
        const existing = gruposMap.get(key);
        if (existing) {
          existing.quantidadeTotal += r.quantity;
          if (!r.comprado) existing.comprado = false;
          if (!existing.orderIds.includes(r.order_id)) existing.orderIds.push(r.order_id);
          existing.itensPorPedido.push(itemPedido);
        } else {
          gruposMap.set(key, {
            nome: r.product_name,
            unidade: r.unit,
            quantidadeTotal: r.quantity,
            comprado: r.comprado,
            orderIds: [r.order_id],
            itensPorPedido: [itemPedido],
          });
        }
      }

      setCompras(Array.from(gruposMap.values()));
    } catch (e) {
      console.error('Erro ao carregar compras:', e);
      Alert.alert('Erro', `Não foi possível carregar a lista de compras: ${(e as any)?.message || 'erro desconhecido'}`);
    } finally {
      setLoadingCompras(false);
    }
  };

  const toggleCompra = async (item: { nome: string; unidade: string; comprado: boolean; orderIds: string[] }) => {
    const novoValor = !item.comprado;
    setCompras(prev => prev.map(c =>
      c.nome === item.nome && c.unidade === item.unidade
        ? { ...c, comprado: novoValor }
        : c
    ));
    try {
      const { error } = await supabase
        .from('order_items_products')
        .update({ comprado: novoValor })
        .in('order_id', item.orderIds)
        .eq('product_name', item.nome)
        .eq('unit', item.unidade);
      if (error) throw error;
    } catch (e) {
      console.error('Erro ao atualizar item de compra:', e);
      Alert.alert('Erro', 'Não foi possível atualizar o item.');
      setCompras(prev => prev.map(c =>
        c.nome === item.nome && c.unidade === item.unidade
          ? { ...c, comprado: !novoValor }
          : c
      ));
    }
  };

  const removerItemCompras = async (item: typeof compras[0]) => {
    Alert.alert(
      'Remover da lista',
      'Remover este item da lista de compras? O produto continua no pedido normalmente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('order_items_products')
                .update({ oculto_compras: true })
                .in('order_id', item.orderIds)
                .eq('product_name', item.nome)
                .eq('unit', item.unidade);
              if (error) throw error;
              setCompras(prev => prev.filter(c => !(c.nome === item.nome && c.unidade === item.unidade)));
            } catch (e) {
              console.error('Erro ao remover item de compras:', e);
              Alert.alert('Erro', 'Não foi possível remover este item.');
            }
          },
        },
      ]
    );
  };

  const handleCompartilharCompras = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Compartilhar', 'Disponível apenas no aplicativo instalado no celular.');
      return;
    }
    const marcados = compras.filter(c => c.comprado);
    if (marcados.length === 0) {
      Alert.alert('Lista vazia', 'Nenhum item marcado como comprado para compartilhar.');
      return;
    }
    let texto = 'Lista de Compras — Muroune Decor\n\n';
    marcados.forEach(item => {
      texto += `${item.nome} — ${item.quantidadeTotal} ${item.unidade}\n`;
      item.itensPorPedido.forEach(ip =>
        texto += `  • ${ip.clienteNome} (Pedido ${ip.numeroPedido}): ${ip.quantidade} ${item.unidade}\n`
      );
      texto += '\n';
    });
    try {
      await Share.share({ message: texto });
    } catch (e) {
      console.error('Erro ao compartilhar lista de compras:', e);
      Alert.alert('Erro', 'Não foi possível abrir o menu de compartilhamento.');
    }
  };

  const eventsOnDate = (date: Date) =>
    events.filter(e => isSameDay(new Date(e.date + 'T00:00:00'), date));

  const today = new Date();
  const monthStart = startOfMonth(currentMonth);
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const startDayOfWeek = monthStart.getDay();
  const weekLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const generateCalendarDays = () => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d);
    }
    return cells;
  };

  const calendarDays = generateCalendarDays();

  const upcomingEvents = [...events]
    .filter(e => new Date(e.date + 'T23:59:59') >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

  const selectedDateEvents = eventsOnDate(selectedDate);

  const getCustomerName = (id: string) =>
    customers.find(c => c.id === id)?.name || '';

  const resetForm = () => {
    setTitle('');
    setCustomerId('');
    setEventTime('09:00');
    setDescription('');
    setEventColor('#C9A96E');
    setEditingEvent(null);
  };

  const openAdd = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setTitle(ev.title);
    setCustomerId(ev.customer_id || '');
    setEventTime(ev.time || '09:00');
    setDescription(ev.description || '');
    setEventColor(ev.color || '#C9A96E');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Título é obrigatório');
      return;
    }
    const payload = {
      title,
      customer_id: customerId || null,
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: eventTime,
      description,
      color: eventColor,
    };
    if (editingEvent) {
      await supabase.from('calendar_events').update(payload).eq('id', editingEvent.id);
    } else {
      await supabase.from('calendar_events').insert(payload);
    }
    setModalVisible(false);
    resetForm();
    loadEvents();
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    Alert.alert('Excluir', 'Excluir este evento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('calendar_events').delete().eq('id', editingEvent.id);
          setModalVisible(false);
          resetForm();
          loadEvents();
        },
      },
    ]);
  };

  const handleDeleteEvento = (eventId: string) => {
    Alert.alert('Excluir', 'Excluir esta visita?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
            if (error) throw error;
            loadEvents();
          } catch (e) {
            console.error('Erro ao excluir evento:', e);
            Alert.alert('Erro', 'Não foi possível excluir esta visita.');
          }
        },
      },
    ]);
  };

  const renderEventCard = (ev: CalendarEvent, showDate = false) => (
    <TouchableOpacity
      key={ev.id}
      style={styles.eventCard}
      onPress={() => {
        if (showDate) setSelectedDate(new Date(ev.date + 'T00:00:00'));
        openEdit(ev);
      }}>
      <View style={[styles.eventBar, { backgroundColor: ev.color || themeColors.primary.main }]} />
      <View style={[styles.eventBody, { flexDirection: 'row' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eventTitle}>{ev.title}</Text>
          {ev.customer_id ? (
            <Text style={styles.eventCustomer}>{getCustomerName(ev.customer_id)}</Text>
          ) : null}
          <Text style={styles.eventTime}>
            {showDate ? format(new Date(ev.date + 'T00:00:00'), 'dd/MM/yyyy') + ' — ' : ''}
            {ev.time || '09:00'}
          </Text>
          {ev.description ? (
            <Text style={styles.eventDesc} numberOfLines={2}>{ev.description}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => handleDeleteEvento(ev.id)}
          style={{ padding: 4, alignSelf: 'flex-start' }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={18} color={themeColors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[themeColors.primary.light, themeColors.primary.main]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Agenda</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.viewBtn, !showList && styles.viewBtnActive]}
            onPress={() => setShowList(false)}>
            <Ionicons name="calendar" size={18} color={!showList ? themeColors.white : themeColors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewBtn, showList && styles.viewBtnActive]}
            onPress={() => setShowList(true)}>
            <Ionicons name="list" size={18} color={showList ? themeColors.white : themeColors.text.secondary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Sub-abas do calendário */}
        <View style={styles.tabRow}>
          {([
            { key: 'visitar', label: 'Visitar' },
            { key: 'entregas', label: 'Entregas' },
            { key: 'compras', label: 'Compras' },
          ] as const).map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, abaCalendario === t.key && styles.tabBtnActive]}
              onPress={() => setAbaCalendario(t.key)}>
              <Text style={[styles.tabBtnText, abaCalendario === t.key && styles.tabBtnTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {abaCalendario === 'visitar' && (
          showList ? (
            /* Lista de próximos eventos */
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Próximos Eventos</Text>
              {upcomingEvents.length === 0 ? (
                <Text style={styles.emptyText}>Nenhum evento próximo</Text>
              ) : (
                upcomingEvents.map(ev => renderEventCard(ev, true))
              )}
            </View>
          ) : (
            <>
              {/* Month Navigation */}
              <View style={styles.monthNav}>
                <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} style={styles.navBtn}>
                  <Ionicons name="chevron-back" size={20} color={themeColors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </Text>
                <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} style={styles.navBtn}>
                  <Ionicons name="chevron-forward" size={20} color={themeColors.text.primary} />
                </TouchableOpacity>
              </View>

              {/* Week day labels */}
              <View style={styles.weekRow}>
                {weekLabels.map(d => (
                  <Text key={d} style={styles.weekLabel}>{d}</Text>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.grid}>
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <View key={`empty-${index}`} style={styles.dayCell} />;
                  }
                  const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                  const isToday = isSameDay(dayDate, today);
                  const isSelected = isSameDay(dayDate, selectedDate);
                  const dayEvts = eventsOnDate(dayDate);
                  return (
                    <TouchableOpacity
                      key={`day-${day}`}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                      ]}
                      onPress={() => setSelectedDate(dayDate)}>
                      <Text style={[
                        styles.dayNum,
                        isToday && styles.dayNumToday,
                        isSelected && styles.dayNumSelected,
                      ]}>
                        {day}
                      </Text>
                      {dayEvts.length > 0 && (
                        <View style={styles.dots}>
                          {dayEvts.slice(0, 3).map((e, i) => (
                            <View key={i} style={[styles.dot, { backgroundColor: e.color || themeColors.primary.main }]} />
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Selected Day Events */}
              <View style={styles.section}>
                <View style={styles.dayHeader}>
                  <Text style={styles.sectionTitle}>
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </Text>
                  <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
                    <Ionicons name="add" size={16} color={themeColors.white} />
                    <Text style={styles.addBtnText}>Visitar</Text>
                  </TouchableOpacity>
                </View>
                {selectedDateEvents.length === 0 ? (
                  <Text style={styles.emptyText}>Nenhum evento neste dia</Text>
                ) : (
                  selectedDateEvents.map(ev => renderEventCard(ev))
                )}
              </View>
            </>
          )
        )}

        {abaCalendario === 'entregas' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entregas Previstas</Text>
            {loadingEntregas ? (
              <Text style={styles.emptyText}>Carregando...</Text>
            ) : entregas.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma entrega prevista</Text>
            ) : (
              entregas.map(item => {
                const dataEntrega = new Date(`${item.prazo_entrega}T00:00:00`);
                const diasRestantes = differenceInCalendarDays(dataEntrega, new Date());
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.eventCard}
                    onPress={() => router.push(`/order/${item.id}`)}>
                    <View style={[styles.eventBar, { backgroundColor: themeColors.primary.main }]} />
                    <View style={styles.eventBody}>
                      <Text style={styles.eventTitle}>{item.customer?.name || 'Sem cliente'}</Text>
                      <Text style={styles.eventCustomer}>Pedido Nº {item.number}</Text>
                      <Text style={styles.eventTime}>
                        Entrega: {format(dataEntrega, 'dd/MM/yyyy', { locale: ptBR })}
                      </Text>
                      <Text style={[
                        styles.eventDesc,
                        { color: diasRestantes < 0 ? themeColors.error : themeColors.primary.dark, fontWeight: '600' },
                      ]}>
                        {diasRestantes === 0
                          ? 'Entrega hoje'
                          : diasRestantes > 0
                            ? `Faltam ${diasRestantes} dia(s)`
                            : `Atrasada ${Math.abs(diasRestantes)} dia(s)`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {abaCalendario === 'compras' && (
          <View style={styles.section}>
            <View style={styles.comprasHeader}>
              <Text style={styles.sectionTitle}>Lista de Compras</Text>
              <TouchableOpacity style={styles.compartilharBtn} onPress={handleCompartilharCompras}>
                <Ionicons name="share-outline" size={18} color={themeColors.white} />
                <Text style={styles.compartilharBtnText}>Compartilhar</Text>
              </TouchableOpacity>
            </View>
            {loadingCompras ? (
              <Text style={styles.emptyText}>Carregando...</Text>
            ) : compras.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum item pendente</Text>
            ) : (
              compras.map((item, idx) => (
                <View key={`${item.nome}-${item.unidade}-${idx}`} style={styles.compraCard}>
                  <View style={styles.compraInfo}>
                    <Text style={styles.compraNome}>{item.nome}</Text>
                    <Text style={styles.compraQtd}>
                      {item.quantidadeTotal} {item.unidade}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removerItemCompras(item)}
                    style={{ padding: 4, marginRight: 8 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={themeColors.error} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.compraCheckbox, item.comprado && styles.compraCheckboxChecked]}
                    onPress={() => toggleCompra(item)}>
                    {item.comprado && <Ionicons name="checkmark" size={18} color={themeColors.white} />}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal: Add/Edit Event */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>
                {editingEvent ? 'Editar Evento' : 'Novo Evento'}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={themeColors.text.primary} />
              </TouchableOpacity>
            </View>

            <KeyboardAwareScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              enableOnAndroid
              extraScrollHeight={20}>
              <Text style={styles.dateLabel}>
                {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Título *"
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={themeColors.text.disabled}
              />

              <TextInput
                style={styles.input}
                placeholder="Hora (ex: 14:30)"
                value={eventTime}
                onChangeText={setEventTime}
                placeholderTextColor={themeColors.text.disabled}
              />

              <Text style={styles.fieldLabel}>Cliente (opcional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {customers.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chip, customerId === c.id && styles.chipActive]}
                    onPress={() => setCustomerId(customerId === c.id ? '' : c.id)}>
                    <Text style={[styles.chipText, customerId === c.id && styles.chipTextActive]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Descrição"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                placeholderTextColor={themeColors.text.disabled}
              />

              <Text style={styles.fieldLabel}>Cor</Text>
              <View style={styles.colorRow}>
                {EVENT_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      eventColor === c && styles.colorCircleActive,
                    ]}
                    onPress={() => setEventColor(c)}
                  />
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>
                  {editingEvent ? 'Salvar Alterações' : 'Adicionar Evento'}
                </Text>
              </TouchableOpacity>

              {editingEvent && (
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                  <Text style={styles.deleteBtnText}>Excluir Evento</Text>
                </TouchableOpacity>
              )}
            </KeyboardAwareScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: typeof lightColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.white, fontFamily: 'Fraunces-Bold' },
  headerRight: { flexDirection: 'row', gap: 6 },
  viewBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewBtnActive: { backgroundColor: colors.primary.main },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 16,
  },
  navBtn: { padding: 4 },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    textTransform: 'capitalize',
    minWidth: 160,
    textAlign: 'center',
    fontFamily: 'Fraunces-SemiBold',
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.light,
    paddingBottom: 4,
    fontFamily: 'WorkSans-SemiBold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 2,
  },
  dayCellSelected: { backgroundColor: colors.primary.light },
  dayNum: { fontSize: 13, color: colors.text.primary, fontFamily: 'WorkSans-Regular' },
  dayNumToday: { fontWeight: '700', color: colors.primary.dark, fontFamily: 'WorkSans-Bold' },
  dayNumSelected: { fontWeight: '700', fontFamily: 'WorkSans-Bold' },
  dots: { flexDirection: 'row', gap: 2, marginTop: 1 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 10, fontFamily: 'Fraunces-Bold' },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.dark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: { color: colors.white, fontSize: 12, fontWeight: '600', fontFamily: 'WorkSans-SemiBold' },
  emptyText: { color: colors.text.disabled, textAlign: 'center', marginTop: 16, fontFamily: 'WorkSans-Regular' },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventBar: { width: 4 },
  eventBody: { flex: 1, padding: 12 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary, fontFamily: 'WorkSans-SemiBold' },
  eventCustomer: { fontSize: 12, color: colors.primary.dark, marginTop: 2, fontFamily: 'WorkSans-Regular' },
  eventTime: { fontSize: 11, color: colors.text.light, marginTop: 2, fontFamily: 'WorkSans-Regular' },
  eventDesc: { fontSize: 12, color: colors.text.secondary, marginTop: 3, fontFamily: 'WorkSans-Regular' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 20,
  },
  modalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary, fontFamily: 'Fraunces-Bold' },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary.dark,
    marginBottom: 12,
    textTransform: 'capitalize',
    fontFamily: 'WorkSans-SemiBold',
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    fontSize: 14,
    color: colors.text.primary,
    fontFamily: 'WorkSans-Regular',
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
    marginTop: 4,
    fontFamily: 'WorkSans-SemiBold',
  },
  chipRow: { marginBottom: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primary.dark, borderColor: colors.primary.dark },
  chipText: { fontSize: 12, color: colors.text.secondary, fontFamily: 'WorkSans-Regular' },
  chipTextActive: { color: colors.white, fontFamily: 'WorkSans-Bold' },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  colorCircle: { width: 32, height: 32, borderRadius: 16 },
  colorCircleActive: { borderWidth: 3, borderColor: colors.text.primary },
  saveBtn: {
    backgroundColor: colors.primary.dark,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '700', fontFamily: 'WorkSans-Bold' },
  deleteBtn: {
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  deleteBtnText: { color: colors.white, fontSize: 16, fontWeight: '700', fontFamily: 'WorkSans-Bold' },

  // Sub-abas do calendário
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    flexShrink: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.primary.dark,
    borderColor: colors.primary.dark,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
    flexShrink: 1,
    flexWrap: 'wrap',
    fontFamily: 'WorkSans-SemiBold',
  },
  tabBtnTextActive: {
    color: colors.white,
    fontFamily: 'WorkSans-Bold',
  },

  // Aba Compras
  comprasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  compartilharBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.dark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  compartilharBtnText: { color: colors.white, fontSize: 12, fontWeight: '600', fontFamily: 'WorkSans-SemiBold' },
  compraCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compraInfo: { flex: 1 },
  compraNome: { fontSize: 14, fontWeight: '600', color: colors.text.primary, fontFamily: 'WorkSans-SemiBold' },
  compraQtd: { fontSize: 12, color: colors.text.secondary, marginTop: 2, fontFamily: 'WorkSans-Regular' },
  compraCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary.dark,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  compraCheckboxChecked: {
    backgroundColor: colors.primary.dark,
  },
});
