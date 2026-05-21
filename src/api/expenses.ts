import { api, unwrap } from './client';
import type {
  Collection,
  CollectorType,
  Expense,
  ExpenseCategory,
  ID,
  PaymentMethod,
} from '@/domain/types';

/**
 * Mirrors backend `createExpenseSchema` in
 * `pharmaERPBackend/src/validators/expense.validator.js`.
 */
export interface ExpenseCreateInput {
  category: ExpenseCategory;
  amount: number;
  description?: string;
  date?: string;
  distributorId?: ID | null;
  doctorId?: ID | null;
  employeeId?: ID | null;
  clientUuid?: string;
}

export interface ExpenseUpdateInput {
  category?: ExpenseCategory;
  amount?: number;
  description?: string;
  date?: string;
}

export interface ExpenseListParams {
  page?: number;
  limit?: number;
  category?: ExpenseCategory;
  search?: string;
  /** Date range filters — backend accepts `dateFrom` / `dateTo`. */
  dateFrom?: string;
  dateTo?: string;
  createdBy?: ID;
}

export const expensesApi = {
  async list(params: ExpenseListParams = {}): Promise<{ items: Expense[]; total: number }> {
    const resp = await api.get('/expenses', { params });
    const data = resp.data;
    return {
      items: (data.data ?? data) as Expense[],
      total: data.pagination?.total ?? (Array.isArray(data.data) ? data.data.length : 0),
    };
  },
  async create(input: ExpenseCreateInput): Promise<Expense> {
    const { clientUuid, ...body } = input;
    const resp = await api.post('/expenses', body, {
      headers: clientUuid ? { 'X-Client-Uuid': clientUuid } : undefined,
    });
    return unwrap<Expense>(resp);
  },
  async update(id: ID, input: ExpenseUpdateInput): Promise<Expense> {
    const resp = await api.put(`/expenses/${id}`, input);
    return unwrap<Expense>(resp);
  },
  async remove(id: ID): Promise<void> {
    await api.delete(`/expenses/${id}`);
  },
};

/**
 * Mirrors backend `createCollectionSchema` in
 * `pharmaERPBackend/src/validators/collection.validator.js`.
 *
 *  - `collectorType` is required (`COMPANY` | `DISTRIBUTOR`).
 *  - `distributorId` is required when `collectorType === 'DISTRIBUTOR'`.
 *  - Use `paymentMethod` (not `method`) and `referenceNumber` (not `refNo`).
 */
export interface CollectionCreateInput {
  pharmacyId: ID;
  collectorType: CollectorType;
  distributorId?: ID | null;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  date?: string;
  notes?: string;
  clientUuid?: string;
}

export interface CollectionListParams {
  page?: number;
  limit?: number;
  pharmacyId?: ID;
  collectorType?: CollectorType;
  paymentMethod?: PaymentMethod;
  dateFrom?: string;
  dateTo?: string;
}

export const collectionsApi = {
  async create(input: CollectionCreateInput): Promise<Collection> {
    const { clientUuid, ...body } = input;
    const resp = await api.post('/collections', body, {
      headers: clientUuid ? { 'X-Client-Uuid': clientUuid } : undefined,
    });
    return unwrap<Collection>(resp);
  },
  async listForPharmacy(pharmacyId: ID): Promise<Collection[]> {
    try {
      const resp = await api.get(`/collections/pharmacy/${pharmacyId}`);
      return unwrap<Collection[]>(resp);
    } catch {
      return [];
    }
  },
  async list(params: CollectionListParams = {}): Promise<{ items: Collection[]; total: number }> {
    const resp = await api.get('/collections', { params });
    const data = resp.data;
    return {
      items: (data.data ?? data) as Collection[],
      total: data.pagination?.total ?? (Array.isArray(data.data) ? data.data.length : 0),
    };
  },
};
