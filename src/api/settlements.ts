import { api, unwrap } from './client';
import type { ID, PaymentMethod, Settlement, SettlementDirection } from '@/domain/types';

export interface SettlementCreateInput {
  distributorId: ID;
  direction: SettlementDirection;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  clientUuid?: string;
}

export const settlementsApi = {
  async create(input: SettlementCreateInput): Promise<Settlement> {
    const { clientUuid, ...body } = input;
    const resp = await api.post('/settlements', body, {
      headers: clientUuid ? { 'X-Client-Uuid': clientUuid } : undefined,
    });
    return unwrap<Settlement>(resp);
  },
};
