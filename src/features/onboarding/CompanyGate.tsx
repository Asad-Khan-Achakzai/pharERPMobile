import * as React from 'react';
import { View } from 'react-native';
import { Construction } from 'lucide-react-native';
import { useAuthStore } from '@/state/authStore';
import { Screen } from '@/ui/Screen';
import { Card } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Text, H2 } from '@/ui/Text';

/**
 * Onboarding-aware empty state. Per plan: non-LIVE tenants should see a
 * "Setup in progress" message instead of being blocked entirely from auth.
 * Field reps cannot use the app until onboarding flips to LIVE.
 */
export const CompanyGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const company = useAuthStore((s) => s.company);
  const signOut = useAuthStore((s) => s.signOut);
  const status = company?.status;
  if (!company || status === 'LIVE' || !status) {
    return <>{children}</>;
  }
  return (
    <Screen padded scroll={false}>
      <View className="flex-1 items-center justify-center px-4">
        <Card className="w-full items-center">
          <View className="h-14 w-14 rounded-2xl bg-warning/10 items-center justify-center mb-3">
            <Construction size={24} color="#f59e0b" />
          </View>
          <H2 className="mb-1">Setup in progress</H2>
          <Text size="sm" tone="muted" className="text-center mb-4">
            Your company &quot;{company.name}&quot; is being set up. Field operations
            will unlock once onboarding goes LIVE. Please reach out to your
            administrator.
          </Text>
          <Button variant="outline" onPress={() => signOut()}>
            Sign out
          </Button>
        </Card>
      </View>
    </Screen>
  );
};
