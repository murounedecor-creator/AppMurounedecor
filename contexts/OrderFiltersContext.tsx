import { createContext, useContext, useState, ReactNode } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, addDays } from 'date-fns';

export type PeriodPreset =
  | 'personalizado'
  | 'ultimos_pedidos'
  | 'todos'
  | 'hoje'
  | 'ontem'
  | 'recentes'
  | 'esta_semana'
  | 'semana_passada'
  | 'este_mes'
  | 'mes_passado'
  | '30dias'
  | '60dias'
  | 'futuros';

export const STATUS_OPTIONS = [
  { id: 'pending', label: 'Pendente' },
  { id: 'waiting_payment', label: 'Aguardando Pagamento' },
  { id: 'in_progress', label: 'Em Andamento' },
  { id: 'completed', label: 'Concluído' },
  { id: 'cancelled', label: 'Cancelado' },
];

type OrderFiltersContextType = {
  periodPreset: PeriodPreset;
  setPeriodPreset: (p: PeriodPreset) => void;
  customStartDate: Date;
  setCustomStartDate: (d: Date) => void;
  customEndDate: Date;
  setCustomEndDate: (d: Date) => void;
  lastOrdersCount: number;
  setLastOrdersCount: (n: number) => void;
  selectedStatuses: string[];
  toggleStatus: (id: string) => void;
  getPeriodLabel: () => string;
  getDateRange: () => { start: Date | null; end: Date | null } | null;
  resetFilters: () => void;
};

const OrderFiltersContext = createContext<OrderFiltersContextType | undefined>(undefined);

export function OrderFiltersProvider({ children }: { children: ReactNode }) {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('ultimos_pedidos');
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date());
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  const [lastOrdersCount, setLastOrdersCount] = useState<number>(20);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const toggleStatus = (id: string) => {
    setSelectedStatuses(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const getDateRange = (): { start: Date | null; end: Date | null } | null => {
    const today = new Date();
    switch (periodPreset) {
      case 'todos':
      case 'ultimos_pedidos':
        return null;
      case 'hoje':
        return { start: today, end: today };
      case 'ontem':
        return { start: subDays(today, 1), end: subDays(today, 1) };
      case 'recentes':
        return { start: subDays(today, 6), end: today };
      case 'esta_semana':
        return {
          start: startOfWeek(today, { weekStartsOn: 1 }),
          end: endOfWeek(today, { weekStartsOn: 1 }),
        };
      case 'semana_passada': {
        const lastWeek = subWeeks(today, 1);
        return {
          start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
          end: endOfWeek(lastWeek, { weekStartsOn: 1 }),
        };
      }
      case 'este_mes':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'mes_passado': {
        const lastMonth = subMonths(today, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      }
      case '30dias':
        return { start: subDays(today, 30), end: subDays(today, 1) };
      case '60dias':
        return { start: subDays(today, 60), end: subDays(today, 1) };
      case 'futuros':
        return { start: addDays(today, 1), end: null };
      case 'personalizado':
        return { start: customStartDate, end: customEndDate };
      default:
        return null;
    }
  };

  const getPeriodLabel = (): string => {
    switch (periodPreset) {
      case 'todos': return 'Todos';
      case 'hoje': return 'Hoje';
      case 'ontem': return 'Ontem';
      case 'recentes': return 'Recentes';
      case 'esta_semana': return 'Esta Semana';
      case 'semana_passada': return 'Semana Passada';
      case 'este_mes': return 'Este Mês';
      case 'mes_passado': return 'Mês Passado';
      case '30dias': return 'Últimos 30 dias';
      case '60dias': return 'Últimos 60 dias';
      case 'futuros': return 'Futuros';
      case 'personalizado': return 'Personalizado';
      case 'ultimos_pedidos': return `Últimos ${lastOrdersCount} Pedidos`;
      default: return 'Recentes';
    }
  };

  const resetFilters = () => {
    setPeriodPreset('ultimos_pedidos');
    setSelectedStatuses([]);
  };

  return (
    <OrderFiltersContext.Provider
      value={{
        periodPreset,
        setPeriodPreset,
        customStartDate,
        setCustomStartDate,
        customEndDate,
        setCustomEndDate,
        lastOrdersCount,
        setLastOrdersCount,
        selectedStatuses,
        toggleStatus,
        getPeriodLabel,
        getDateRange,
        resetFilters,
      }}>
      {children}
    </OrderFiltersContext.Provider>
  );
}

export function useOrderFilters() {
  const context = useContext(OrderFiltersContext);
  if (!context) {
    throw new Error('useOrderFilters precisa ser usado dentro de OrderFiltersProvider');
  }
  return context;
}
