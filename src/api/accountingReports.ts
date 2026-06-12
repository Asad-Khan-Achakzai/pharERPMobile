import { api, unwrap } from './client';

export interface GeneralLedgerEntry {
  date: string;
  voucherNumber: string;
  voucherType: string;
  voucherId: string;
  accountCode: string;
  accountName: string;
  narration?: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface GeneralLedgerAccountBucket {
  account: { _id: string; code: string; name: string };
  openingBalance: number;
  closingBalance: number;
  entries: GeneralLedgerEntry[];
}

export const accountingReportsApi = {
  async generalLedger(params: {
    from?: string;
    to?: string;
    accountId?: string;
  } = {}): Promise<GeneralLedgerAccountBucket[]> {
    const resp = await api.get('/accounting-reports/general-ledger', { params });
    const data = resp.data?.data ?? resp.data;
    return (data?.accounts ?? []) as GeneralLedgerAccountBucket[];
  },
};
