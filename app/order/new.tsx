import { PermissionGate } from '@/auth/PermissionGate';
import { OrderFormWizard } from '@/features/orders/OrderFormWizard';

export default function NewOrder() {
  return (
    <PermissionGate screen="order_new" title="New order">
      <OrderFormWizard mode="create" />
    </PermissionGate>
  );
}
