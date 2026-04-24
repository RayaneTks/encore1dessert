import type { BundleOfferRule, Dessert } from '../types';
import { formatBundleOfferLabel, formatRevenueLineCaption, resolveRuleForDessert, unitRevenueListForBundle } from './bundleOffer';

function catalogUnit(d: Dessert, customerType: 'particulier' | 'pro'): number {
  return customerType === 'pro' ? d.sellPricePro : d.sellPriceParticulier;
}

/** Même règle + même famille + même prix catalogue = même pool d’unités. */
function offerGroupKey(
  d: Dessert,
  pCat: number,
  customerType: 'particulier' | 'pro',
  rules: BundleOfferRule[],
): string {
  const rule = resolveRuleForDessert(d, customerType, rules);
  const rid = rule?.id ?? '_';
  return `${rid}::${d.productKind}::${(Math.round(pCat * 1e6) / 1e6).toFixed(2)}`;
}

function lineCatalog(
  d: Dessert,
  customerType: 'particulier' | 'pro',
  it: { catalogueUnitOverride?: number },
): number {
  if (
    it.catalogueUnitOverride !== undefined &&
    it.catalogueUnitOverride !== null &&
    Number.isFinite(it.catalogueUnitOverride) &&
    it.catalogueUnitOverride >= 0
  ) {
    return it.catalogueUnitOverride;
  }
  return catalogUnit(d, customerType);
}

export interface CommandeAllocationLine {
  dessert: Dessert;
  quantity: number;
  /** Montant figé à l’enregistrement. */
  frozenRevenue: { totalRevenue: number; unitPrice: number };
  /** Légende affichage, ex. « 1 × 3,00 € + 1 × 3,60 € » (règle : unités comptées dans l’ordre des lignes de la commande). */
  revenueCaption: string;
  /** Libellé d’offre figé (vide = tarif catalogue). */
  bundleOfferLabelAtSale: string;
  /** Prix unitaire catalogue utilisé pour ce bloc (saisie / figé). */
  catalogueUnitAtSale: number;
}

type Unit = { lineIdx: number; dessert: Dessert; pCat: number; key: string };

/**
 * Parcourt les lignes de commande **dans l’ordre**, alloue 3 €/u puis 3,60 €/u (etc.) sur la séquence
 * d’unités d’un même palier (même famille + même prix catalogue), sans moyenner à 3,10.
 */
export function buildCommandeSaleAllocations(
  items: { dessertId: string | null; quantity: number; catalogueUnitOverride?: number }[],
  getDessert: (dessertId: string) => Dessert | undefined,
  customerType: 'particulier' | 'pro',
  bundleRules: BundleOfferRule[],
): { lines: CommandeAllocationLine[]; skippedLines: number } {
  const units: Unit[] = [];
  let skipped = 0;
  for (let lineIdx = 0; lineIdx < items.length; lineIdx++) {
    const it = items[lineIdx];
    if (!it.dessertId) {
      if (it.quantity > 0) skipped++;
      continue;
    }
    if (it.quantity <= 0) continue;
    const d = getDessert(it.dessertId);
    if (!d) {
      skipped++;
      continue;
    }
    const pLine = lineCatalog(d, customerType, it);
    for (let u = 0; u < it.quantity; u++) {
      units.push({
        lineIdx,
        dessert: d,
        pCat: pLine,
        key: offerGroupKey(d, pLine, customerType, bundleRules),
      });
    }
  }
  if (units.length === 0) return { lines: [], skippedLines: skipped };

  const byKey = new Map<string, Unit[]>();
  for (const u of units) {
    if (!byKey.has(u.key)) byKey.set(u.key, []);
    byKey.get(u.key)!.push(u);
  }

  const lineCents = new Map<number, number[]>();

  for (const g of byKey.values()) {
    if (g.length === 0) continue;
    const d0 = g[0].dessert;
    const pCat = g[0].pCat;
    const rule = resolveRuleForDessert(d0, customerType, bundleRules);
    const list = unitRevenueListForBundle(g.length, pCat, rule, customerType, d0.productKind);
    g.forEach((slot, k) => {
      const c = Math.round(list[k] * 100);
      const a = lineCents.get(slot.lineIdx) ?? [];
      a.push(c);
      lineCents.set(slot.lineIdx, a);
    });
  }

  const out: CommandeAllocationLine[] = [];
  for (let lineIdx = 0; lineIdx < items.length; lineIdx++) {
    const it = items[lineIdx];
    if (!it.dessertId || it.quantity <= 0) continue;
    const d = getDessert(it.dessertId);
    if (!d) continue;
    const cents = lineCents.get(lineIdx);
    if (!cents || cents.length === 0) continue;
    const tr = cents.reduce((s, c) => s + c, 0) / 100;
    const q = it.quantity;
    const caption = formatRevenueLineCaption(cents.map(c => c / 100));
    const rLine = resolveRuleForDessert(d, customerType, bundleRules);
    const pCat = lineCatalog(d, customerType, it);
    const catTotal = pCat * q;
    const offerLabel =
      rLine && Math.abs(tr - catTotal) > 0.01 ? formatBundleOfferLabel(rLine) : '';
    out.push({
      dessert: d,
      quantity: q,
      frozenRevenue: { totalRevenue: tr, unitPrice: q > 0 ? tr / q : 0 },
      revenueCaption: caption,
      bundleOfferLabelAtSale: offerLabel,
      catalogueUnitAtSale: pCat,
    });
  }
  return { lines: out, skippedLines: skipped };
}
