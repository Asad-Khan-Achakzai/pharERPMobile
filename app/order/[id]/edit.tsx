/**
 * Edit Order (Mobile) — Web Parity Contract
 *
 *  Web reference: `pharmaERPFE/src/views/orders/EditOrderPage.tsx`
 *  Backend route:  `PUT /api/v1/orders/:id`
 *  Only PENDING orders are editable (enforced in UI and on backend).
 */
import { useLocalSearchParams } from 'expo-router';
import { PermissionGate } from '@/auth/PermissionGate';
import { OrderFormWizard } from '@/features/orders/OrderFormWizard';

function EditOrderImpl() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OrderFormWizard mode="edit" orderId={id} />;
}

export default function EditOrder() {
  return (
    <PermissionGate screen="order_edit" title="Edit order">
      <EditOrderImpl />
    </PermissionGate>
  );
}
