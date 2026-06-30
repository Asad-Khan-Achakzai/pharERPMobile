import type { ID, Order, OrderItem, Product } from '@/domain/types';

/** Internal draft mirrors web `OrderItemForm`. `manualBonus` is UI-only. */
export interface LineDraft {
  productId: string;
  productName: string;
  rateEstimate: number;
  quantity: number;
  distributorDiscount: number;
  clinicDiscount: number;
  bonusQuantity: number;
  manualBonus: boolean;
}

/** Mirrors backend `calculateBonus` (`pharmaERPBackend/src/utils/bonus.js`). */
export function calculateBonus(qty: number, buyQty: number, getQty: number): number {
  if (!buyQty || !getQty || qty <= 0) return 0;
  return Math.floor(qty / buyQty) * getQty;
}

export function refId(
  ref: string | { _id?: ID } | null | undefined
): string {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return ref._id ?? '';
}

export function linesFromOrderItems(
  items: OrderItem[],
  schemeBuy: number,
  schemeGet: number
): Record<string, LineDraft> {
  const out: Record<string, LineDraft> = {};
  for (const it of items) {
    const productId = refId(it.productId as string | { _id?: ID });
    if (!productId) continue;
    const buy = it.bonusScheme?.buyQty ?? schemeBuy;
    const get = it.bonusScheme?.getQty ?? schemeGet;
    const auto = calculateBonus(it.quantity, buy, get);
    const bonusQuantity = it.bonusQuantity ?? 0;
    out[productId] = {
      productId,
      productName:
        it.productName ??
        (typeof it.productId === 'object' && it.productId && 'name' in it.productId
          ? String((it.productId as { name?: string }).name ?? productId)
          : productId),
      rateEstimate: it.tpAtTime ?? 0,
      quantity: it.quantity,
      distributorDiscount: it.distributorDiscount ?? 0,
      clinicDiscount: it.clinicDiscount ?? 0,
      bonusQuantity,
      manualBonus: bonusQuantity !== auto,
    };
  }
  return out;
}

/** Ensure order-line products appear in the picker even if absent from catalog. */
export function mergeCatalogWithLines(
  catalog: Product[],
  lines: Record<string, LineDraft>
): Product[] {
  const seen = new Set(catalog.map((p) => p._id));
  const extras: Product[] = [];
  Object.values(lines).forEach((line) => {
    if (seen.has(line.productId) || line.quantity <= 0) return;
    extras.push({
      _id: line.productId,
      name: line.productName,
      tp: line.rateEstimate,
    });
    seen.add(line.productId);
  });
  return extras.length ? [...extras, ...catalog] : catalog;
}

export function orderTotals(lines: Record<string, LineDraft>) {
  let grossTp = 0;
  let pharmacyDiscount = 0;
  let bonusUnits = 0;
  Object.values(lines).forEach((l) => {
    const lineTp = l.quantity * l.rateEstimate;
    grossTp += lineTp;
    pharmacyDiscount += lineTp * ((l.clinicDiscount || 0) / 100);
    bonusUnits += l.bonusQuantity;
  });
  return {
    grossTp,
    pharmacyDiscount,
    netPharmacy: grossTp - pharmacyDiscount,
    bonusUnits,
  };
}

export function isOrderEditable(order: Order | undefined): boolean {
  return order?.status === 'PENDING';
}
