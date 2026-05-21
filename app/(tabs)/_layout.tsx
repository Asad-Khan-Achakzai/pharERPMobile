/**
 * Field shell tabs — permission-driven, field-work first.
 *
 * Tab order prioritizes daily rep operations (Home → Visits → Doctors → Orders).
 * Manager modules (Approvals, team attendance) are reachable from More, not as
 * primary tabs, so medical reps never see an "Approvals-only" tab bar.
 */
import { Tabs } from 'expo-router';
import {
  Calendar,
  Home,
  ShoppingCart,
  Users,
  Menu,
} from 'lucide-react-native';
import { usePermissions } from '@/hooks/usePermissions';

export default function RepTabsLayout() {
  const { canSee } = usePermissions();

  const home = canSee('rep_home');
  const visits = canSee('rep_visits');
  const doctors = canSee('rep_doctors');
  const orders = canSee('rep_orders');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          href: home ? '/(tabs)' : null,
          tabBarIcon: ({ color, size }) => <Home color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="visits"
        options={{
          title: 'Visits',
          href: visits ? '/(tabs)/visits' : null,
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="doctors"
        options={{
          title: 'Doctors',
          href: doctors ? '/(tabs)/doctors' : null,
          tabBarIcon: ({ color, size }) => <Users color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          href: orders ? '/(tabs)/orders' : null,
          tabBarIcon: ({ color, size }) => <ShoppingCart color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size ?? 22} />,
        }}
      />
    </Tabs>
  );
}
