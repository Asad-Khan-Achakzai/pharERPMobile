import * as React from 'react';
import { View } from 'react-native';
import { Building2, Landmark, Wallet } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { ListRow, Divider } from '@/ui/ListRow';
import { PermissionGate } from '@/auth/PermissionGate';
import { usePermissions } from '@/hooks/usePermissions';
import { usePushWithReturn } from '@/navigation/usePushWithReturn';
import { useTheme } from '@/theme/ThemeProvider';

function PaymentsHubImpl() {
  const pushWithReturn = usePushWithReturn();
  const { canDo } = usePermissions();
  const { colors } = useTheme();
  const canRecord = canDo('collection_create');

  return (
    <Screen padded={false}>
      <Header back title="Payments & collections" />
      <Card className="mx-4 mt-2" padded={false}>
        {canRecord ? (
          <>
            <ListRow
              left={<Wallet size={18} color={colors.primary} />}
              title="Record collection"
              subtitle="Money received from a pharmacy"
              chevron
              onPress={() => pushWithReturn('/payments/record-collection')}
            />
            <Divider />
            <ListRow
              left={<Landmark size={18} color={colors.primary} />}
              title="Record settlement"
              subtitle="Distributor clearing balance with company"
              chevron
              onPress={() => pushWithReturn('/payments/record-settlement')}
            />
            <Divider />
          </>
        ) : null}
        <ListRow
          left={<Building2 size={18} color={colors.foreground} />}
          title="Browse pharmacies"
          subtitle="View balances and record from a pharmacy profile"
          chevron
          onPress={() => pushWithReturn('/pharmacy')}
        />
      </Card>
    </Screen>
  );
}

export default function PaymentsHub() {
  return (
    <PermissionGate anyOf={['payments.view', 'payments.create', 'pharmacies.view']} title="Payments">
      <PaymentsHubImpl />
    </PermissionGate>
  );
}
