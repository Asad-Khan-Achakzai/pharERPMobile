import { api, unwrap } from './client';
import type { ID } from '@/domain/types';

export interface LedgerRow {
  _id: string;
  entityType?: string;
  entityId?: string;
  type?: string;
  amount?: number;
  balance?: number;
  date?: string;
  description?: string;
  pharmacyId?: { _id: string; name?: string } | string;
}

export interface SubLedgerEntry {
  _id: string;
  date: string;
  referenceType: string;
  description?: string;
  category?: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface SupplierStatement {
  supplierId: ID;
  supplierName: string;
  supplierCity?: string;
  openingBalance: number;
  closingBalance: number;
  entries: SubLedgerEntry[];
}

export const ledgerApi = {
  async list(params: { limit?: number; search?: string } = {}): Promise<LedgerRow[]> {
    const resp = await api.get('/ledger', { params: { limit: params.limit ?? 50, search: params.search } });
    const data = resp.data;
    const rows = data.data ?? data;
    return Array.isArray(rows) ? rows : [];
  },

  async supplierStatement(params: {
    supplierId: ID;
    from?: string;
    to?: string;
  }): Promise<SupplierStatement> {
    const resp = await api.get('/ledger/supplier-statement', { params });
    return unwrap<SupplierStatement>(resp);
  },
};

export function formatPkr(amount?: number | null): string {
  return `Rs ${(amount ?? 0).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
