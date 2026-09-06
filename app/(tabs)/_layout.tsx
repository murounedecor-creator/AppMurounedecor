import { withLayoutContext } from 'expo-router';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabNavigationOptions,
  MaterialTopTabNavigationEventMap,
} from '@react-navigation/material-top-tabs';
import { ParamListBase, TabNavigationState } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { Navigator } = createMaterialTopTabNavigator();

const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBarContainer,
        { paddingBottom: Platform.OS === 'ios' ? insets.bottom || 20 : 10 },
      ]}>
      <LinearGradient
        colors={[colors.white, colors.primary.light]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const label = options.title ?? route.name;
        const color = isFocused ? colors.primary.dark : colors.text.light;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.tabItem}>
            {options.tabBarIcon ? options.tabBarIcon({ color, focused: isFocused }) : null}
            <Text style={[styles.tabLabel, { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      screenOptions={{ swipeEnabled: true, lazy: true }}
      tabBar={(props) => <CustomTabBar {...props} />}>
      <MaterialTopTabs.Screen
        name="dashboard"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="home" size={24} color={color} />
          ),
        }}
      />
      <MaterialTopTabs.Screen
        name="customers"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="people" size={24} color={color} />
          ),
        }}
      />
      <MaterialTopTabs.Screen
        name="orders"
        options={{
          title: 'Pedidos',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="list" size={24} color={color} />
          ),
        }}
      />
      <MaterialTopTabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="calendar" size={24} color={color} />
          ),
        }}
      />
      <MaterialTopTabs.Screen
        name="financials"
        options={{
          title: 'Financeiro',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="cash" size={24} color={color} />
          ),
        }}
      />
      <MaterialTopTabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color }: { color: string }) => (
            <Ionicons name="menu" size={24} color={color} />
          ),
        }}
      />
    </MaterialTopTabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 10,
    height: Platform.OS === 'ios' ? 80 : 60,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'WorkSans-SemiBold',
  },
});
