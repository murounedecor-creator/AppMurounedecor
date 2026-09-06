import { Share, Linking, Alert } from 'react-native';
import { Customer } from '@/lib/supabase';

export function openCustomerMap(address: string, city: string) {
  if (!address || !city) {
    Alert.alert('Aviso', 'Endereço incompleto');
    return;
  }
  const url = `https://www.google.com/maps/search/${encodeURIComponent(
    `${address}, ${city}`
  )}`;
  Linking.openURL(url);
}

export async function shareCustomer(customer: Customer) {
  let message = `Nome: ${customer.name}`;
  if (customer.phone) {
    message += `\nTelefone: ${customer.phone}`;
  }
  if (customer.address) {
    message += `\nEndereço: ${customer.address}${customer.city ? `, ${customer.city}` : ''}`;
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(
      `${customer.address}, ${customer.city}`
    )}`;
    message += `\nMaps: ${mapsUrl}`;
  }
  try {
    await Share.share({ message });
  } catch (e) {
    console.error('Erro ao compartilhar cliente:', e);
    Alert.alert('Erro', 'Não foi possível abrir o menu de compartilhamento.');
  }
}
