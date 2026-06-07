import * as React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Wallet } from 'lucide-react-native';
import { Screen } from '@/ui/Screen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { Text, H2, Subtitle } from '@/ui/Text';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { TextField } from '@/ui/TextField';
import { SkeletonRow } from '@/ui/Skeleton';
import { StickyActionBar } from '@/ui/StickyActionBar';
import { AttachReceiptButton } from '@/ui/media/AttachReceiptButton';
import { useToast } from '@/ui/Toast';
import { masterQueries } from '@/data/masterQueries';
import { pharmaciesApi } from '@/api/pharmacies';
import { collectionsApi } from '@/api/expenses';
import { ApiError } from '@/api/client';
import { outbox } from '@/data/outbox';
import { flushOutbox } from '@/data/syncEngine';
import { usePermissions } from '@/hooks/usePermissions';
import type { CollectorType, PaymentMethod } from '@/domain/types';

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'CASH', label: 'Cash' },
  { key: 'CHEQUE', label: 'Cheque' },
  { key: 'BANK_TRANSFER', label: 'Bank transfer' },
  { key: 'UPI', label: 'UPI' },
];

export default function PharmacyProfile() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { canDo } = usePermissions();
  const canCollect = canDo('collection_create');
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['pharmacy', id], queryFn: () => masterQueries.pharmacyById(id) });
  const fin = useQuery({
    queryKey: ['pharmacy', id, 'financials'],
    queryFn: () => pharmaciesApi.financials(id),
  });

  const [collecting, setCollecting] = React.useState(false);
  const [amount, setAmount] = React.useState('');
  /**
   * Backend `collectorType` — mobile only books `COMPANY` collections (medical
   * rep collecting on behalf of the company). Distributor settlements happen
   * from the web admin panel. Keep this in the payload to satisfy the schema.
   */
  const collectorType: CollectorType = 'COMPANY';
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('CASH');
  const [referenceNumber, setReferenceNumber] = React.useState('');
  const [notes, setNotes] = React.useState('');

  function buildBody() {
    return {
      pharmacyId: id,
      collectorType,
      amount: Number(amount),
      paymentMethod,
      referenceNumber: referenceNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    };
  }

  const submit = useMutation({
    mutationFn: () => collectionsApi.create({ ...buildBody(), clientUuid: uuidv4() }),
    onSuccess: () => {
      toast.show({ tone: 'success', message: 'Collection recorded' });
      setCollecting(false);
      setAmount('');
      setReferenceNumber('');
      setNotes('');
      qc.invalidateQueries({ queryKey: ['pharmacy', id, 'financials'] });
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
        setCollecting(false);
        await flushOutbox();
        return;
      }
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Could not save' });
    },
  });

  if (q.isLoading || !q.data) {
    return (
      <Screen padded>
        <SkeletonRow count={5} />
      </Screen>
    );
  }
  const p = q.data;
  const outstanding = fin.data?.outstanding ?? p.outstanding ?? 0;
  const valid = Number(amount) > 0;

  return (
    <View className="flex-1 bg-background">
      <Header back title={p.name} subtitle={p.city ?? ''} />
      <Screen padded={false}>
        <Card className="mx-4 mt-2">
          <H2>{p.name}</H2>
          <Subtitle>{[p.address, p.city].filter(Boolean).join(', ') || '—'}</Subtitle>
          <View className="flex-row items-center mt-3 justify-between">
            <View>
              <Subtitle>Outstanding</Subtitle>
              <Text size="2xl" weight="bold">
                Rs {Math.round(outstanding).toLocaleString()}
              </Text>
            </View>
            <Badge tone={outstanding > 0 ? 'warning' : 'success'}>
              {outstanding > 0 ? 'Due' : 'Up to date'}
            </Badge>
          </View>
        </Card>

        {collecting ? (
          <Card className="mx-4 mt-2">
            <Text size="base" weight="semibold" className="mb-2">
              Record collection
            </Text>
            <TextField
              label="Amount"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              required
            />
            <Text size="xs" tone="muted" className="mb-1">
              Payment method
            </Text>
            <View className="flex-row flex-wrap mb-2">
              {PAYMENT_METHODS.map((m) => (
                <View key={m.key} className="mr-2 mb-2">
                  <Button
                    size="sm"
                    variant={paymentMethod === m.key ? 'primary' : 'outline'}
                    onPress={() => setPaymentMethod(m.key)}
                  >
                    {m.label}
                  </Button>
                </View>
              ))}
            </View>
            <TextField
              label="Reference no."
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
            <AttachReceiptButton variant="payment" className="mt-1 mb-2" />
            <View className="flex-row mt-2">
              <Button
                variant="outline"
                onPress={() => setCollecting(false)}
                className="flex-1 mr-2"
              >
                Cancel
              </Button>
              <Button
                onPress={() => submit.mutate()}
                loading={submit.isPending}
                disabled={!valid}
                className="flex-1"
              >
                Save
              </Button>
            </View>
          </Card>
        ) : null}
      </Screen>
      {!collecting && canCollect ? (
        <StickyActionBar>
          <Button
            fullWidth
            onPress={() => setCollecting(true)}
            leftIcon={<Wallet size={18} color="#fff" />}
          >
            Record collection
          </Button>
        </StickyActionBar>
      ) : null}
    </View>
  );
}
