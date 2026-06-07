/**
 * New Expense (Mobile) — Web Parity Contract
 *
 *  Web reference: `pharmaERPFE/src/views/expenses/ExpenseListPage.tsx` dialog.
 *  Backend route:  `POST /api/v1/expenses`
 *  Backend validator: `createExpenseSchema` in
 *    `pharmaERPBackend/src/validators/expense.validator.js`
 *
 *  Canonical categories live in `EXPENSE_CATEGORY` enum:
 *    DOCTOR_INVESTMENT | SALARY | RENT | LOGISTICS | OFFICE | OTHER.
 *
 *  NOTE: There is NO approval workflow on the backend. Expenses are
 *  auto-marked `approvedBy = currentUser` on create. We do not surface a
 *  PENDING/APPROVED/REJECTED status anywhere.
 */
import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { TextField } from '@/ui/TextField';
import { Button } from '@/ui/Button';
import { Text, Label } from '@/ui/Text';
import { StickyActionBar } from '@/ui/StickyActionBar';
import { Tabs } from '@/ui/Tabs';
import { AttachReceiptButton } from '@/ui/media/AttachReceiptButton';
import { useToast } from '@/ui/Toast';
import { expensesApi } from '@/api/expenses';
import { PermissionGate } from '@/auth/PermissionGate';
import { ApiError } from '@/api/client';
import { outbox } from '@/data/outbox';
import { localEntities } from '@/data/localEntities';
import { flushOutbox } from '@/data/syncEngine';
import type { ExpenseCategory } from '@/domain/types';

const CATEGORIES: { key: ExpenseCategory; label: string }[] = [
  { key: 'DOCTOR_INVESTMENT', label: 'Doctor investment' },
  { key: 'LOGISTICS', label: 'Logistics' },
  { key: 'OFFICE', label: 'Office' },
  { key: 'RENT', label: 'Rent' },
  { key: 'SALARY', label: 'Salary' },
  { key: 'OTHER', label: 'Other' },
];

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function NewExpenseImpl() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [category, setCategory] = React.useState<ExpenseCategory>('OTHER');
  const [amount, setAmount] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [date, setDate] = React.useState(todayYmd());

  function buildBody() {
    return {
      category,
      amount: Number(amount),
      date,
      description: description.trim() || undefined,
    };
  }

  const submit = useMutation({
    mutationFn: () => expensesApi.create({ ...buildBody(), clientUuid: uuidv4() }),
    onSuccess: () => {
      toast.show({ tone: 'success', message: 'Expense submitted' });
      qc.invalidateQueries({ queryKey: ['expenses', 'list'] });
      router.back();
    },
    onError: async (err: unknown) => {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr && (apiErr.status >= 500 || apiErr.status === 0)) {
        const clientUuid = uuidv4();
        const body = buildBody();
        await outbox.enqueueCore({
          feature: 'expense',
          action: 'create',
          method: 'POST',
          path: '/expenses',
          body,
          clientUuid,
        });
        await localEntities.upsert({
          clientUuid,
          feature: 'expense',
          entityType: 'expense',
          display: {
            _id: `local:${clientUuid}`,
            clientUuid,
            category: body.category,
            amount: body.amount,
            date: body.date,
            description: body.description,
            status: 'APPROVED',
          },
        });
        toast.show({ tone: 'info', message: 'Saved offline. Will sync.' });
        await flushOutbox();
        router.back();
        return;
      }
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Could not save' });
    },
  });

  const valid = Number(amount) >= 0.01 && !!category && /^\d{4}-\d{2}-\d{2}$/.test(date);

  return (
    <Screen padded={false} keyboardAvoid>
      <Header back title="New expense" />
      <Card className="mx-4 mt-2">
        <Label className="mb-2">Category</Label>
        <Tabs
          scrollable
          value={category}
          onChange={(k) => setCategory(k as ExpenseCategory)}
          items={CATEGORIES.map((c) => ({ key: c.key, label: c.label }))}
        />
        <TextField
          label="Amount"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          required
        />
        <TextField
          label="Date"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
        />
        <TextField
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />
        <View className="mt-2">
          <AttachReceiptButton variant="expense" />
          <Text size="xs" tone="muted" className="mt-2">
            Receipt upload is optional. UI stays visible whether storage is configured or not.
          </Text>
        </View>
      </Card>
      <StickyActionBar>
        <Button
          onPress={() => submit.mutate()}
          loading={submit.isPending}
          disabled={!valid}
          fullWidth
        >
          Submit expense
        </Button>
      </StickyActionBar>
    </Screen>
  );
}

export default function NewExpense() {
  return (
    <PermissionGate screen="expense_new" title="New expense">
      <NewExpenseImpl />
    </PermissionGate>
  );
}
