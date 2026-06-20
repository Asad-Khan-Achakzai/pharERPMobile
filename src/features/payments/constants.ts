import type { PaymentMethod } from '@/domain/types';

export const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'CASH', label: 'Cash' },
  { key: 'CHEQUE', label: 'Cheque' },
  { key: 'BANK_TRANSFER', label: 'Bank transfer' },
  { key: 'UPI', label: 'UPI' },
];
