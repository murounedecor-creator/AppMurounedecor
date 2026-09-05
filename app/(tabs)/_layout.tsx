import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, withOpacity } from '@/constants/colors';
import { Platform, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

function TabIcon({ name, color, size, focused }: { name: string; color: string; size: number; focused: boolean }) {
  if (focused) {
    return (
      <LinearGradient
        colors={[colors.primary.main, colors.primary.light, colors.primary.dark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.activePill}>
        <Ionicons name={name as any} size={size - 2} color={colors.white} />
      </LinearGradient>
    );
  }
  return <Ionicons name={name as any} size={size} color={color} />;
}

const styles = StyleSheet.create({
  activePill: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withOpacity(colors.primary.light, 0.5),
    overflow: 'hidden',
  },
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.dark,
        tabBarInactiveTintColor: colors.text.light,
        tabBarStyle: {
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 80 : 60,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={[colors.white, colors.primary.light, colors.primary.main]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          fontFamily: 'WorkSans-SemiBold',
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="home" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="people" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pedidos',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="list" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="calendar" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="financials"
        options={{
          title: 'Financeiro',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="cash" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="menu" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
