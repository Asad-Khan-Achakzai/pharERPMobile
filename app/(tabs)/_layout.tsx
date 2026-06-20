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
import { useTheme } from '@/theme/ThemeProvider';
import { useTabBarLayout } from '@/navigation/useTabBarLayout';

export default function RepTabsLayout() {
  const { canSee } = usePermissions();
  const { colors } = useTheme();
  const { bottomInset, totalHeight } = useTabBarLayout();

  const home = canSee('rep_home');
  const visits = canSee('rep_visits');
  const doctors = canSee('rep_doctors');
  const orders = canSee('rep_orders');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: totalHeight,
          paddingTop: 6,
          paddingBottom: bottomInset,
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
