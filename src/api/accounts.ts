import { api, unwrap } from './client';
import type { ID, MoneyAccount } from '@/domain/types';

export const accountsApi = {
  async listMoneyAccounts(): Promise<MoneyAccount[]> {
    const resp = await api.get('/accounts/money-accounts');
    return unwrap<MoneyAccount[]>(resp);
  },
};

export function moneyAccountLabel(account: MoneyAccount): string {
  const code = account.code?.trim();
  const name = account.name?.trim() || 'Account';
  return code ? `${code} · ${name}` : name;
}

export function resolveMoneyAccountId(
  value: MoneyAccount | ID | null | undefined
): ID | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value._id ?? null;
}
