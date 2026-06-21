import * as React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { FormScreen } from '@/ui/FormScreen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text, Label } from '@/ui/Text';
import { TextField } from '@/ui/TextField';
import { Button } from '@/ui/Button';
import { FilterChip } from '@/ui/FilterChip';
import { AttachReceiptButton } from '@/ui/media/AttachReceiptButton';
import { useToast } from '@/ui/Toast';
import { PermissionGate } from '@/auth/PermissionGate';
import { collectionsApi } from '@/api/expenses';
import { pharmaciesApi } from '@/api/pharmacies';
import { distributorsApi } from '@/api/products';
import { ApiError } from '@/api/client';
import { outbox } from '@/data/outbox';
import { flushOutbox } from '@/data/syncEngine';
import { useMediaPicker, type PickedMedia } from '@/hooks/useMediaPicker';
import { EntityLookup, type LookupEntity } from '@/features/payments/EntityLookup';
import { MoneyAccountPicker } from '@/features/payments/MoneyAccountPicker';
import { PaymentMethodPicker } from '@/features/payments/PaymentMethodPicker';
import type { CollectorType, ID, PaymentMethod } from '@/domain/types';

function RecordCollectionImpl() {
  const router = useRouter();
  const toast = useToast();
  const { pick } = useMediaPicker();
  const [receipt, setReceipt] = React.useState<PickedMedia | null>(null);
  const { pharmacyId: pharmacyIdParam } = useLocalSearchParams<{ pharmacyId?: string }>();

  async function attachReceipt() {
    const picked = await pick({ source: 'ask' });
    if (picked) {
      setReceipt(picked);
      toast.show({ tone: 'success', message: 'Receipt attached' });
    }
  }

  const [collectorType, setCollectorType] = React.useState<CollectorType>('COMPANY');
  const [pharmacy, setPharmacy] = React.useState<LookupEntity | null>(null);
  const [distributor, setDistributor] = React.useState<LookupEntity | null>(null);
  const [pharmacySearch, setPharmacySearch] = React.useState('');
  const [distributorSearch, setDistributorSearch] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [moneyAccountId, setMoneyAccountId] = React.useState<ID | ''>('');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('CASH');
  const [referenceNumber, setReferenceNumber] = React.useState('');
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    const pid = pharmacyIdParam?.trim();
    if (!pid) return;
    let cancel = false;
    void pharmaciesApi.getById(pid).then((row) => {
      if (!cancel && row) {
        setPharmacy({ _id: row._id, name: row.name, subtitle: row.city ?? undefined });
      }
    });
    return () => {
      cancel = true;
    };
  }, [pharmacyIdParam]);

  const pharmacyHits = useQuery({
    queryKey: ['pharmacies', 'lookup', pharmacySearch.trim()],
    queryFn: () => pharmaciesApi.lookup(pharmacySearch.trim(), 25),
    enabled: pharmacySearch.trim().length >= 1 && !pharmacy,
  });

  const distributorHits = useQuery({
    queryKey: ['distributors', 'lookup', distributorSearch.trim()],
    queryFn: () => distributorsApi.lookup(distributorSearch.trim(), 25),
    enabled: collectorType === 'DISTRIBUTOR' && distributorSearch.trim().length >= 1 && !distributor,
  });

  const needsDistributor = collectorType === 'DISTRIBUTOR';
  const valid =
    !!pharmacy &&
    Number(amount) > 0 &&
    !!moneyAccountId &&
    (!needsDistributor || !!distributor);

  function buildBody() {
    return {
      pharmacyId: pharmacy!._id,
      collectorType,
      ...(needsDistributor ? { distributorId: distributor!._id } : {}),
      amount: Number(amount),
      paymentMethod,
      moneyAccountId: moneyAccountId as ID,
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    };
  }

  const submit = useMutation({
    mutationFn: () => collectionsApi.create({ ...buildBody(), clientUuid: uuidv4() }),
    onSuccess: async (collection) => {
      if (receipt) {
        await outbox.enqueueMedia({
          feature: 'collection',
          kind: 'PAYMENT_RECEIPT',
          fileUri: receipt.uri,
          mime: receipt.mime,
          size: receipt.size,
          relatedResource: 'collections',
          relatedId: collection._id,
        });
        await flushOutbox();
      }
      toast.show({ tone: 'success', message: 'Collection recorded' });
      router.back();
    },
    onError: async (err: unknown) => {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr && (apiErr.status >= 500 || apiErr.status === 0)) {
        await outbox.enqueueCore({
          feature: 'collection',
          action: 'create',
          method: 'POST',
          path: '/collections',
          body: buildBody(),
          clientUuid: uuidv4(),
        });
        toast.show({ tone: 'info', message: 'Saved offline. Will sync.' });
        await flushOutbox();
        router.back();
        return;
      }
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Could not record collection' });
    },
  });

  return (
    <FormScreen
      header={
        <Header
          back
          title="Record collection"
          subtitle="Money received from pharmacy"
        />
      }
      footer={
        <Button
          fullWidth
          onPress={() => submit.mutate()}
          loading={submit.isPending}
          disabled={!valid}
        >
          Record collection
        </Button>
      }
    >
      <Card className="mx-4 mt-2">
          <Label>Collected by *</Label>
          <Text size="xs" tone="muted" className="mb-2">
            Company: FIFO across all distributors. Distributor: applied only to that distributor’s receivable.
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-1">
            <FilterChip
              label="Company"
              selected={collectorType === 'COMPANY'}
              onPress={() => {
                setCollectorType('COMPANY');
                setDistributor(null);
              }}
            />
            <FilterChip
              label="Distributor"
              selected={collectorType === 'DISTRIBUTOR'}
              onPress={() => setCollectorType('DISTRIBUTOR')}
            />
          </View>

          <EntityLookup
            label="Pharmacy"
            helperText="Search by pharmacy name"
            required
            value={pharmacy}
            onChange={setPharmacy}
            search={pharmacySearch}
            onSearchChange={setPharmacySearch}
            loading={pharmacyHits.isLoading}
            results={(pharmacyHits.data ?? []).map((p) => ({
              _id: p._id,
              name: p.name,
              subtitle: p.city ?? undefined,
              imageUrl: p.imageUrl ?? null,
            }))}
          />

          {needsDistributor ? (
            <EntityLookup
              label="Distributor who collected"
              helperText="Money is applied FIFO only to this distributor’s receivable from the pharmacy"
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
          ) : null}

          <TextField
            label="Amount (PKR)"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            required
          />

          <MoneyAccountPicker value={moneyAccountId} onChange={setMoneyAccountId} required />
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
          <AttachReceiptButton
            variant="payment"
            className="mt-1"
            onAttach={attachReceipt}
            helper={receipt ? 'Receipt attached' : undefined}
          />
      </Card>
    </FormScreen>
  );
}

export default function RecordCollectionScreen() {
  return (
    <PermissionGate anyOf={['payments.create']} title="Record collection">
      <RecordCollectionImpl />
    </PermissionGate>
  );
}
