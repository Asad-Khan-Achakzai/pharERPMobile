import { api, unwrap } from './client';
import * as FileSystem from 'expo-file-system/legacy';
import { Share } from 'react-native';
import type { ID, Order } from '@/domain/types';

/**
 * Backend `createOrderSchema` items shape — see
 * `pharmaERPBackend/src/validators/order.validator.js`.
 *
 * NOTE: the server snapshots `tpAtTime`/`castingAtTime` from the product
 * master, so we do **not** send a price. We only send discounts and bonus qty.
 */
export interface NewOrderLineInput {
  productId: ID;
  quantity: number;
  distributorDiscount?: number;
  clinicDiscount?: number;
  bonusQuantity?: number;
}

export interface NewOrderInput {
  pharmacyId: ID;
  /** Optional on backend; web auto-defaults from pharmacy-linked doctors. */
  doctorId?: ID | null;
  distributorId: ID;
  /** Required by backend; defaulted to current user when omitted. */
  medicalRepId?: ID;
  /** Optional soft link to a planned/unplanned visit for analytics. */
  visitLogId?: ID | null;
  items: NewOrderLineInput[];
  notes?: string;
  clientUuid?: string;
}

export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  pharmacyId?: ID;
  medicalRepId?: ID;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: ID;
}

export const ordersApi = {
  async list(params: OrderListParams = {}): Promise<{
    items: Order[];
    total: number;
    page: number;
    limit: number;
  }> {
    const resp = await api.get('/orders', { params });
    const data = resp.data;
    return {
      items: (data.data ?? data) as Order[],
      total: data.pagination?.total ?? (Array.isArray(data.data) ? data.data.length : 0),
      page: data.pagination?.page ?? params.page ?? 1,
      limit: data.pagination?.limit ?? params.limit ?? 20,
    };
  },
  async getById(id: ID): Promise<Order> {
    const resp = await api.get(`/orders/${id}`);
    return unwrap<Order>(resp);
  },
  async create(input: NewOrderInput): Promise<Order> {
    const { clientUuid, ...body } = input;
    const resp = await api.post('/orders', body, {
      headers: clientUuid ? { 'X-Client-Uuid': clientUuid } : undefined,
    });
    return unwrap<Order>(resp);
  },

  async openDeliveryInvoice(orderId: ID, deliveryId: ID): Promise<void> {
    const resp = await api.get(`/orders/${orderId}/deliveries/${deliveryId}/invoice`, {
      responseType: 'arraybuffer',
    });
    const bytes = new Uint8Array(resp.data as ArrayBuffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const base64 =
      typeof globalThis.btoa === 'function'
        ? globalThis.btoa(binary)
        : (() => {
            throw new Error('PDF encoding is unavailable on this device');
          })();
    const path = `${FileSystem.cacheDirectory}invoice-${deliveryId}.pdf`;
    await FileSystem.writeAsStringAsync(path, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await Share.share({ url: path, title: 'Delivery invoice' });
  },
};
