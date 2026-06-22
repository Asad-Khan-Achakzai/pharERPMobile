import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { FormScreen } from '@/ui/FormScreen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Label } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Button } from '@/ui/Button';
import { FilterChip } from '@/ui/FilterChip';
import { useToast } from '@/ui/Toast';
import { PermissionGate } from '@/auth/PermissionGate';
import { settlementsApi } from '@/api/settlements';
import { distributorsApi } from '@/api/products';
import { ApiError } from '@/api/client';
import { outbox } from '@/data/outbox';
import { flushOutbox } from '@/data/syncEngine';
import { EntityLookup, type LookupEntity } from '@/features/payments/EntityLookup';
import { MoneyAccountPicker } from '@/features/payments/MoneyAccountPicker';
import { PaymentMethodPicker } from '@/features/payments/PaymentMethodPicker';
import type { ID, PaymentMethod, SettlementDirection } from '@/domain/types';

function RecordSettlementImpl() {
  const router = useRouter();
  const toast = useToast();

  const [direction, setDirection] =
    React.useState<SettlementDirection>('DISTRIBUTOR_TO_COMPANY');
  const [distributor, setDistributor] = React.useState<LookupEntity | null>(null);
  const [distributorSearch, setDistributorSearch] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [moneyAccountId, setMoneyAccountId] = React.useState<ID | ''>('');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('CASH');
  const [referenceNumber, setReferenceNumber] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const isDistributorToCompany = direction === 'DISTRIBUTOR_TO_COMPANY';

  const distributorHits = useQuery({
    queryKey: ['distributors', 'lookup', distributorSearch.trim()],
    queryFn: () => distributorsApi.lookup(distributorSearch.trim(), 25),
    enabled: distributorSearch.trim().length >= 1 && !distributor,
  });

  const valid = !!distributor && Number(amount) > 0 && !!moneyAccountId;

  function buildBody() {
    return {
      distributorId: distributor!._id,
      direction,
      amount: Number(amount),
      paymentMethod,
      moneyAccountId: moneyAccountId as ID,
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    };
  }

  const submit = useMutation({
    mutationFn: () => settlementsApi.create({ ...buildBody(), clientUuid: uuidv4() }),
    onSuccess: () => {
      toast.show({ tone: 'success', message: 'Settlement recorded' });
      router.back();
    },
    onError: async (err: unknown) => {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr && (apiErr.status >= 500 || apiErr.status === 0)) {
        await outbox.enqueueCore({
          feature: 'settlement',
          action: 'create',
          method: 'POST',
          path: '/settlements',
          body: buildBody(),
          clientUuid: uuidv4(),
        });
        toast.show({ tone: 'info', message: 'Saved offline. Will sync.' });
        await flushOutbox();
        router.back();
        return;
      }
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Could not record settlement' });
    },
  });

  return (
    <FormScreen
      header={
        <Header
          back
          title="Record settlement"
          subtitle="Clears distributor clearing balance FIFO"
        />
      }
      footer={
        <Button
          fullWidth
          onPress={() => submit.mutate()}
          loading={submit.isPending}
          disabled={!valid}
        >
          Record settlement
        </Button>
      }
    >
      <Card className="mx-4 mt-2">
          <Label>Direction *</Label>
          <View className="gap-2 mb-3">
            <FilterChip
              label="Distributor pays company"
              selected={direction === 'DISTRIBUTOR_TO_COMPANY'}
              onPress={() => setDirection('DISTRIBUTOR_TO_COMPANY')}
              className="self-start"
            />
            <FilterChip
              label="Company pays distributor"
              selected={direction === 'COMPANY_TO_DISTRIBUTOR'}
              onPress={() => setDirection('COMPANY_TO_DISTRIBUTOR')}
              className="self-start"
            />
          </View>

          <EntityLookup
            label="Distributor"
            helperText="Search by distributor name"
            required
            value={distributor}
            onChange={setDistributor}
            search={distributorSearch}
            onSearchChange={setDistributorSearch}
            loading={distributorHits.isLoading}
            results={(distributorHits.data ?? []).map((d) => ({
              _id: d._id,
              name: d.name,
            }))}
          />

          <TextField
            label="Amount (PKR)"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            required
          />

          <MoneyAccountPicker
            value={moneyAccountId}
            onChange={setMoneyAccountId}
            required
            label={
              isDistributorToCompany
                ? 'Deposit to (cash/bank account)'
                : 'Paid from (cash/bank account)'
            }
            helperText={
              isDistributorToCompany
                ? 'Which account received this settlement'
                : 'Which account this settlement was paid from'
            }
          />

          <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />

          <TextField
            label="Reference number"
            value={referenceNumber}
            onChangeText={setReferenceNumber}
            placeholder={paymentMethod === 'CHEQUE' ? 'Cheque #' : 'Optional reference'}
          />
          <TextField
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
        />
      </Card>
    </FormScreen>
  );
}

export default function RecordSettlementScreen() {
  return (
    <PermissionGate anyOf={['payments.create']} title="Record settlement">
      <RecordSettlementImpl />
    </PermissionGate>
  );
}
