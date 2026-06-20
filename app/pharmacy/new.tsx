/**
 * Create Pharmacy (Mobile) — Web Parity Contract
 *
 *  Web reference: `pharmaERPFE/src/views/pharmacies/list/PharmacyListPage.tsx` dialog.
 *  Backend route:  `POST /api/v1/pharmacies`
 *  Backend validator: `createPharmacySchema` in
 *    `pharmaERPBackend/src/validators/pharmacy.validator.js`
 *
 *  Fields: name (required), address, city, state, phone, email, discountOnTP,
 *  bonusScheme.{buyQty,getQty}.
 */
import * as React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FormScreen } from '@/ui/FormScreen';
import { Header } from '@/ui/Header';
import { Card } from '@/ui/Card';
import { TextField } from '@/ui/TextField';
import { Button } from '@/ui/Button';
import { useToast } from '@/ui/Toast';
import { pharmaciesApi, type PharmacyCreateInput } from '@/api/pharmacies';
import { PermissionGate } from '@/auth/PermissionGate';

interface Draft {
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  discountOnTP: string;
  buyQty: string;
  getQty: string;
}

const EMPTY: Draft = {
  name: '',
  address: '',
  city: '',
  state: '',
  phone: '',
  email: '',
  discountOnTP: '',
  buyQty: '',
  getQty: '',
};

function toPayload(d: Draft): PharmacyCreateInput {
  const out: PharmacyCreateInput = { name: d.name.trim() };
  if (d.address.trim()) out.address = d.address.trim();
  if (d.city.trim()) out.city = d.city.trim();
  if (d.state.trim()) out.state = d.state.trim();
  if (d.phone.trim()) out.phone = d.phone.trim();
  if (d.email.trim()) out.email = d.email.trim();
  if (d.discountOnTP.trim()) {
    const n = Number(d.discountOnTP);
    if (Number.isFinite(n)) out.discountOnTP = Math.min(100, Math.max(0, n));
  }
  const buyQty = Number(d.buyQty || 0);
  const getQty = Number(d.getQty || 0);
  if (Number.isFinite(buyQty) && Number.isFinite(getQty) && (buyQty > 0 || getQty > 0)) {
    out.bonusScheme = {
      buyQty: Math.max(0, buyQty),
      getQty: Math.max(0, getQty),
    };
  }
  return out;
}

function NewPharmacyImpl() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = React.useState<Draft>(EMPTY);

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((p) => ({ ...p, [k]: v }));
  }

  const valid = draft.name.trim().length >= 1;

  const create = useMutation({
    mutationFn: () => pharmaciesApi.create(toPayload(draft)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pharmacies'] });
      toast.show({ tone: 'success', message: 'Pharmacy added' });
      router.back();
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message;
      toast.show({ tone: 'danger', message: msg ?? 'Could not save' });
    },
  });

  return (
    <FormScreen
      header={<Header back title="Add pharmacy" />}
      footer={
        <Button
          onPress={() => create.mutate()}
          loading={create.isPending}
          disabled={!valid}
          fullWidth
        >
          Save pharmacy
        </Button>
      }
    >
      <Card className="mx-4 mt-2">
        <TextField label="Name" required value={draft.name} onChangeText={(v) => set('name', v)} />
        <TextField
          label="Phone"
          value={draft.phone}
          onChangeText={(v) => set('phone', v)}
          keyboardType="phone-pad"
        />
        <TextField
          label="Email"
          value={draft.email}
          onChangeText={(v) => set('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Card>

      <Card className="mx-4 mt-2">
        <TextField label="City" value={draft.city} onChangeText={(v) => set('city', v)} />
        <TextField label="State" value={draft.state} onChangeText={(v) => set('state', v)} />
        <TextField
          label="Address"
          value={draft.address}
          onChangeText={(v) => set('address', v)}
          multiline
          numberOfLines={2}
        />
      </Card>

      <Card className="mx-4 mt-2">
        <TextField
          label="Discount on TP (%)"
          value={draft.discountOnTP}
          onChangeText={(v) => set('discountOnTP', v)}
          keyboardType="numeric"
        />
        <View className="flex-row">
          <TextField
            label="Bonus: Buy qty"
            value={draft.buyQty}
            onChangeText={(v) => set('buyQty', v)}
            keyboardType="numeric"
            containerClassName="flex-1 mr-2"
          />
          <TextField
            label="Bonus: Get qty"
            value={draft.getQty}
            onChangeText={(v) => set('getQty', v)}
            keyboardType="numeric"
            containerClassName="flex-1"
          />
        </View>
      </Card>
    </FormScreen>
  );
}

export default function NewPharmacy() {
  return (
    <PermissionGate screen="pharmacy_new" title="Add pharmacy">
      <NewPharmacyImpl />
    </PermissionGate>
  );
}
