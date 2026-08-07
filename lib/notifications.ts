import { Platform } from 'react-native';

const Notifications = Platform.OS !== 'web' ? require('expo-notifications') : null;

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function scheduleOrderReminder(
  orderId: string,
  clienteNome: string,
  prazoEntrega: string,
  lembreteDiasAntes: number
): Promise<string | null> {
  if (!Notifications) return null;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.error('Permissão de notificação negada para pedido:', orderId);
    return null;
  }

  const dataEntrega = new Date(`${prazoEntrega}T09:00:00`);
  const dataLembrete = new Date(dataEntrega);
  dataLembrete.setDate(dataLembrete.getDate() - lembreteDiasAntes);

  if (dataLembrete.getTime() <= Date.now()) {
    console.error('Data de lembrete já passou, não agendado:', orderId);
    return null;
  }

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Entrega se aproximando',
        body: `Pedido de ${clienteNome} — entrega em ${lembreteDiasAntes} dia(s)`,
        data: { orderId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dataLembrete,
      },
    });
  } catch (e) {
    console.error('Erro ao agendar notificação:', e);
    return null;
  }
}

export async function cancelOrderReminder(notificationId: string | null): Promise<void> {
  if (!Notifications || !notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    console.error('Erro ao cancelar notificação:', e);
  }
}
