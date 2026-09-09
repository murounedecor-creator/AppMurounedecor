import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';

// Mesmo mapeamento de unidades usado em app/products.tsx
const UNIT_LABEL_TO_CODE: Record<string, string> = {
  unitario: 'un',
  un: 'un',
  metroquadrado: 'm2',
  m2: 'm2',
  'm²': 'm2',
  metrolinear: 'm',
  metro: 'm',
  m: 'm',
  quilograma: 'kg',
  kg: 'kg',
  litro: 'lt',
  lt: 'lt',
  hora: 'h',
  h: 'h',
  diaria: 'd',
  d: 'd',
  semanal: 'sem',
  sem: 'sem',
};

interface PreviewRow {
  rowNumber: number;
  name: string;
  code: string;
  sale_price_per_unit: number | null;
  cost_price_per_unit: number | null;
  unit_type: string | null;
  error: string | null;
}

const normalizeKey = (key: string): string =>
  key
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const parsePrice = (value: any): number | null => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return value;
  const normalized = String(value).trim().replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
};

export default function ImportProductsScreen() {
  const { themeColors } = useTheme();
  const styles = getStyles(themeColors);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  const validRows = rows.filter(r => !r.error);
  const errorRows = rows.filter(r => r.error);

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      const validExt = /\.(xlsx|xls|csv)$/i.test(asset.name || '');
      if (!validExt) {
        Alert.alert('Arquivo inválido', 'Selecione um arquivo .xlsx, .xls ou .csv');
        return;
      }

      setParsing(true);
      setFileName(asset.name);
      setRows([]);

      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const workbook = XLSX.read(base64, { type: 'base64' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const parsedRows: PreviewRow[] = rawRows.map((raw, index) => {
        const normalized: Record<string, any> = {};
        Object.keys(raw).forEach(k => {
          normalized[normalizeKey(k)] = raw[k];
        });

        const name = String(normalized['nome'] || '').trim();
        const code = String(normalized['codigo'] || '').trim();
        const salePrice = parsePrice(normalized['preco de venda']);
        const costPrice = parsePrice(normalized['preco de custo']);
        const unitRaw = String(normalized['unidade'] || '').trim();
        const unitKey = normalizeKey(unitRaw).replace(/\s+/g, '');
        const unitCode = UNIT_LABEL_TO_CODE[unitKey] || null;

        let error: string | null = null;
        if (!name) error = 'Nome ausente';
        else if (!code) error = 'Código ausente';
        else if (salePrice === null) error = 'Preço de venda inválido';
        else if (costPrice === null) error = 'Preço de custo inválido';
        else if (!unitCode) error = `Unidade "${unitRaw}" não reconhecida`;

        return {
          rowNumber: index + 2, // +2: linha 1 é o cabeçalho
          name,
          code,
          sale_price_per_unit: salePrice,
          cost_price_per_unit: costPrice,
          unit_type: unitCode,
          error,
        };
      });

      setRows(parsedRows);
    } catch (e: any) {
      console.error('Erro ao ler planilha:', e);
      Alert.alert('Erro', `Não foi possível ler o arquivo: ${e?.message || 'erro desconhecido'}`);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;
    Alert.alert(
      'Confirmar importação',
      `${validRows.length} produto(s) serão importados/atualizados. Produtos com código já existente serão atualizados com os novos dados. Deseja continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          onPress: async () => {
            setImporting(true);
            try {
              const payload = validRows.map(r => ({
                name: r.name,
                code: r.code,
                sale_price_per_unit: r.sale_price_per_unit,
                cost_price_per_unit: r.cost_price_per_unit,
                unit_type: r.unit_type,
              }));
              const { error } = await supabase
                .from('products')
                .upsert(payload, { onConflict: 'code' });
              if (error) throw error;
              Alert.alert('Sucesso', `${payload.length} produto(s) importado(s)/atualizado(s) com sucesso.`, [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (e: any) {
              console.error('Erro ao importar produtos:', e);
              Alert.alert('Erro', `Não foi possível importar: ${e?.message || 'erro desconhecido'}`);
            } finally {
              setImporting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[themeColors.primary.light, themeColors.primary.main]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={themeColors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Importar Produtos</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>
          A planilha (.xlsx ou .csv) deve ter as colunas: Nome, Código, Preço de Venda, Preço de
          Custo e Unidade (Unitário, Metro Linear, Metro Quadrado, Quilograma, Litro, Hora, Diária
          ou Semanal). Se o Código já existir, o produto será atualizado.
        </Text>
      </View>

      <TouchableOpacity style={styles.pickButton} onPress={handlePickFile} disabled={parsing}>
        <Ionicons name="document-attach-outline" size={20} color={themeColors.white} />
        <Text style={styles.pickButtonText}>
          {fileName ? `Trocar arquivo (${fileName})` : 'Selecionar planilha'}
        </Text>
      </TouchableOpacity>

      {parsing && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={themeColors.primary.main} />
          <Text style={styles.loadingText}>Lendo planilha...</Text>
        </View>
      )}

      {!parsing && rows.length > 0 && (
        <>
          <View style={styles.summaryRow}>
            <View style={[styles.summaryBadge, { backgroundColor: themeColors.status.completed }]}>
              <Text style={styles.summaryBadgeText}>{validRows.length} válidos</Text>
            </View>
            {errorRows.length > 0 && (
              <View style={[styles.summaryBadge, { backgroundColor: themeColors.error }]}>
                <Text style={styles.summaryBadgeText}>{errorRows.length} com erro</Text>
              </View>
            )}
          </View>

          <FlatList
            data={rows}
            keyExtractor={item => String(item.rowNumber)}
            contentContainerStyle={{ paddingBottom: 100 }}
            renderItem={({ item }) => (
              <View style={[styles.rowCard, item.error ? styles.rowCardError : null]}>
                <Text style={styles.rowNumber}>Linha {item.rowNumber}</Text>
                <Text style={styles.rowName}>{item.name || '(sem nome)'}</Text>
                {item.error ? (
                  <Text style={styles.rowError}>{item.error}</Text>
                ) : (
                  <Text style={styles.rowDetail}>
                    Código: {item.code} • Venda: R${' '}
                    {item.sale_price_per_unit?.toFixed(2).replace('.', ',')} • Custo: R${' '}
                    {item.cost_price_per_unit?.toFixed(2).replace('.', ',')} • {item.unit_type}
                  </Text>
                )}
              </View>
            )}
          />

          <TouchableOpacity
            style={[styles.importButton, validRows.length === 0 && styles.importButtonDisabled]}
            onPress={handleImport}
            disabled={validRows.length === 0 || importing}>
            {importing ? (
              <ActivityIndicator size="small" color={themeColors.white} />
            ) : (
              <Text style={styles.importButtonText}>
                Importar {validRows.length} produto(s)
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    title: { fontSize: 18, fontWeight: '700', color: colors.white, fontFamily: 'Fraunces-Bold' },
    instructions: {
      margin: 20,
      marginBottom: 0,
      padding: 14,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    instructionsText: {
      fontSize: 13,
      color: colors.text.secondary,
      fontFamily: 'WorkSans-Regular',
      lineHeight: 19,
    },
    pickButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary.main,
      marginHorizontal: 20,
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: 10,
    },
    pickButtonText: { color: colors.white, fontWeight: '600', fontFamily: 'WorkSans-SemiBold' },
    centered: { alignItems: 'center', marginTop: 30, gap: 10 },
    loadingText: { color: colors.text.secondary, fontFamily: 'WorkSans-Regular' },
    summaryRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 16 },
    summaryBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    summaryBadgeText: { color: colors.white, fontWeight: '600', fontSize: 12, fontFamily: 'WorkSans-SemiBold' },
    rowCard: {
      marginHorizontal: 20,
      marginTop: 10,
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowCardError: { borderColor: colors.error },
    rowNumber: { fontSize: 11, color: colors.text.secondary, fontFamily: 'WorkSans-Regular' },
    rowName: { fontSize: 15, fontWeight: '700', color: colors.text.primary, fontFamily: 'WorkSans-SemiBold' },
    rowDetail: { fontSize: 12, color: colors.text.secondary, marginTop: 2, fontFamily: 'WorkSans-Regular' },
    rowError: { fontSize: 12, color: colors.error, marginTop: 2, fontFamily: 'WorkSans-SemiBold' },
    importButton: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      right: 20,
      backgroundColor: colors.primary.dark,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    importButtonDisabled: { opacity: 0.5 },
    importButtonText: { color: colors.white, fontWeight: '700', fontSize: 15, fontFamily: 'WorkSans-SemiBold' },
  });
