import * as React from 'react';
import { View, FlatList, Modal, RefreshControl } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isValid } from 'date-fns';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { Card } from '@/ui/Card';
import { Text, Subtitle } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { TextField } from '@/ui/TextField';
import { SkeletonRow } from '@/ui/Skeleton';
import { EmptyState } from '@/ui/EmptyState';
import { useToast } from '@/ui/Toast';
import { expensesApi } from '@/api/expenses';
import type { Expense, ID } from '@/domain/types';

function employeeName(expense: Expense): string {
  const e = expense.employeeId;
  if (e && typeof e === 'object' && 'name' in e) return e.name ?? 'Rep';
  return 'Field rep';
}

export const ExpensesApprovalQueue: React.FC = () => {
  const toast = useToast();
  const qc = useQueryClient();
  const [rejectFor, setRejectFor] = React.useState<Expense | null>(null);
  const [rejectReason, setRejectReason] = React.useState('');

  const list = useQuery({
    queryKey: ['expenses', 'inbox'],
    queryFn: () => expensesApi.inbox(),
  });

  const approve = useMutation({
    mutationFn: (id: ID) => expensesApi.approve(id),
    onSuccess: () => {
      toast.show({ tone: 'success', message: 'Expense approved' });
      qc.invalidateQueries({ queryKey: ['expenses', 'inbox'] });
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
        <SkeletonRow count={4} />
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
                  onPress={() => approve.mutate(item._id)}
                  leftIcon={<CheckCircle2 size={14} color="#fff" />}
                >
                  Approve
                </Button>
              </View>
            </Card>
          );
        }}
      />

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
              <Button variant="outline" className="flex-1 mr-2" onPress={() => setRejectFor(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={rejectReason.trim().length < 3}
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
