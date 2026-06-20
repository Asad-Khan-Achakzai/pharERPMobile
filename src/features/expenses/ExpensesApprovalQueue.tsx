import * as React from 'react';
import { View, FlatList, Modal, RefreshControl, ScrollView } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { Card } from '@/ui/Card';
import { Text, Subtitle, Label } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { TextField } from '@/ui/TextField';
import { ListSkeletonList } from '@/ui/listCardSkeletons';
import { EmptyState } from '@/ui/EmptyState';
import { useToast } from '@/ui/Toast';
import { FilterOption } from '@/ui/FilterOption';
import { expensesApi } from '@/api/expenses';
import { accountsApi, moneyAccountLabel, resolveMoneyAccountId } from '@/api/accounts';
import type { Expense, ID, MoneyAccount } from '@/domain/types';

function employeeName(expense: Expense): string {
  const e = expense.employeeId;
  if (e && typeof e === 'object' && 'name' in e) return e.name ?? 'Rep';
  return 'Field rep';
}

function defaultMoneyAccountId(
  expense: Expense | null,
  accounts: MoneyAccount[]
): ID | '' {
  if (!accounts.length) return '';
  const existing = resolveMoneyAccountId(expense?.moneyAccountId);
  if (existing && accounts.some((a) => a._id === existing)) return existing;
  const cash = accounts.find((a) => a.moneyAccountNature === 'CASH');
  return cash?._id ?? accounts[0]._id;
}

export const ExpensesApprovalQueue: React.FC = () => {
  const toast = useToast();
  const qc = useQueryClient();
  const [rejectFor, setRejectFor] = React.useState<Expense | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');
  const [approveFor, setApproveFor] = React.useState<Expense | null>(null);
  const [moneyAccountId, setMoneyAccountId] = React.useState<ID | ''>('');

  const list = useQuery({
    queryKey: ['expenses', 'inbox'],
    queryFn: () => expensesApi.inbox(),
  });

  const moneyAccounts = useQuery({
    queryKey: ['accounts', 'money'],
    queryFn: () => accountsApi.listMoneyAccounts(),
    enabled: !!approveFor,
  });

  React.useEffect(() => {
    if (!approveFor || !moneyAccounts.data?.length) return;
    setMoneyAccountId((prev) =>
      prev && moneyAccounts.data!.some((a) => a._id === prev)
        ? prev
        : defaultMoneyAccountId(approveFor, moneyAccounts.data!)
    );
  }, [approveFor, moneyAccounts.data]);

  const approve = useMutation({
    mutationFn: ({ id, moneyAccountId: accountId }: { id: ID; moneyAccountId: ID }) =>
      expensesApi.approve(id, { moneyAccountId: accountId }),
    onSuccess: () => {
      toast.show({ tone: 'success', message: 'Expense approved' });
      qc.invalidateQueries({ queryKey: ['expenses', 'inbox'] });
      qc.invalidateQueries({ queryKey: ['expenses', 'list'] });
      setApproveFor(null);
      setMoneyAccountId('');
    },
    onError: (err: unknown) => {
      toast.show({ tone: 'danger', message: (err as Error)?.message ?? 'Could not approve' });
    },
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: ID; reason: string }) => expensesApi.reject(id, reason),
    onSuccess: () => {
      toast.show({ tone: 'info', message: 'Expense rejected' });
      qc.invalidateQueries({ queryKey: ['expenses', 'inbox'] });
      setRejectFor(null);
      setRejectReason('');
    },
    onError: (err: unknown) => {
      toast.show({ tone: 'danger', message: (err as Error)?.message ?? 'Could not reject' });
    },
  });

  if (list.isLoading) {
    return (
      <View className="px-4">
        <ListSkeletonList count={4} variant="expense" />
      </View>
    );
  }

  if (!list.data?.length) {
    return (
      <EmptyState
        title="No pending expenses"
        description="Submitted field expenses will appear here for approval."
      />
    );
  }

  const approvingId = approve.isPending ? approve.variables?.id ?? null : null;
  const rejectingId = reject.isPending ? reject.variables?.id ?? null : null;
  const anyPending = approve.isPending || reject.isPending;

  return (
    <>
      <FlatList
        data={list.data}
        keyExtractor={(e) => e._id}
        contentContainerClassName="px-4 pt-1 pb-8"
        ItemSeparatorComponent={() => <View className="h-2" />}
        refreshControl={
          <RefreshControl refreshing={list.isFetching && !list.isLoading} onRefresh={() => list.refetch()} />
        }
        renderItem={({ item }) => {
          const d = item.date ? parseISO(item.date) : null;
          const rowLocked = anyPending && approvingId !== item._id && rejectingId !== item._id;
          return (
            <Card>
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text size="base" weight="semibold" numberOfLines={1}>
                    {employeeName(item)}
                  </Text>
                  <Subtitle numberOfLines={2}>{item.description || 'Expense'}</Subtitle>
                  <Text size="xs" tone="muted" className="mt-1">
                    {d && isValid(d) ? format(d, 'd MMM yyyy') : '—'} · Rs{' '}
                    {Math.round(item.amount).toLocaleString()}
                  </Text>
                </View>
                <Badge tone="warning">PENDING</Badge>
              </View>
              <View className="flex-row mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 mr-2"
                  disabled={rowLocked || approvingId === item._id}
                  onPress={() => {
                    setRejectReason('');
                    setRejectFor(item);
                  }}
                  leftIcon={<XCircle size={14} color="#ef4444" />}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={rowLocked || rejectingId === item._id}
                  onPress={() => {
                    setMoneyAccountId('');
                    setApproveFor(item);
                  }}
                  leftIcon={<CheckCircle2 size={14} color="#fff" />}
                >
                  Approve
                </Button>
              </View>
            </Card>
          );
        }}
      />

      <Modal visible={!!approveFor} transparent animationType="fade">
        <View className="flex-1 bg-black/40 justify-center px-4">
          <Card>
            <Text size="lg" weight="semibold">
              Approve expense
            </Text>
            <Text size="sm" tone="muted" className="mt-1">
              {approveFor?.description || 'Field expense'} · Rs{' '}
              {Math.round(approveFor?.amount ?? 0).toLocaleString()}
            </Text>
            <Label className="mt-4 mb-2">Paid from</Label>
            <Text size="xs" tone="muted" className="mb-2">
              Which cash or bank account was used for this payment?
            </Text>
            {moneyAccounts.isLoading ? (
              <ListSkeletonList count={2} variant="split" className="px-0 pt-0" />
            ) : (moneyAccounts.data ?? []).length === 0 ? (
              <Text size="sm" tone="muted">
                No money accounts are configured for this company.
              </Text>
            ) : (
              <ScrollView
                style={{ maxHeight: 220 }}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
                contentContainerClassName="pb-1"
              >
                {(moneyAccounts.data ?? []).map((account) => {
                  const selected = moneyAccountId === account._id;
                  return (
                    <FilterOption
                      key={account._id}
                      label={moneyAccountLabel(account)}
                      description={account.moneyAccountNature ?? undefined}
                      selected={selected}
                      onPress={() => setMoneyAccountId(account._id)}
                    />
                  );
                })}
              </ScrollView>
            )}
            <View className="flex-row mt-4 pt-3 border-t border-border">
              <Button
                variant="outline"
                className="flex-1 mr-2"
                disabled={approve.isPending}
                onPress={() => {
                  setApproveFor(null);
                  setMoneyAccountId('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                loading={approve.isPending}
                disabled={!moneyAccountId || moneyAccounts.isLoading || approve.isPending}
                onPress={() => {
                  if (!approveFor || !moneyAccountId) return;
                  approve.mutate({ id: approveFor._id, moneyAccountId });
                }}
              >
                Approve
              </Button>
            </View>
          </Card>
        </View>
      </Modal>

      <Modal visible={!!rejectFor} transparent animationType="fade">
        <View className="flex-1 bg-black/40 justify-center px-4">
          <Card>
            <Text size="lg" weight="semibold">
              Reject expense
            </Text>
            <TextField
              label="Reason"
              required
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Why is this expense rejected?"
              className="mt-3"
            />
            <View className="flex-row mt-4">
              <Button
                variant="outline"
                className="flex-1 mr-2"
                disabled={reject.isPending}
                onPress={() => setRejectFor(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                loading={reject.isPending}
                disabled={rejectReason.trim().length < 3 || reject.isPending}
                onPress={() => {
                  if (!rejectFor) return;
                  reject.mutate({ id: rejectFor._id, reason: rejectReason.trim() });
                }}
              >
                Reject
              </Button>
            </View>
          </Card>
        </View>
      </Modal>
    </>
  );
};
