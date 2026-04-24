import { fmt } from './calculations';
import type { BundleOfferRule, Dessert, DessertProductKind } from '../types';

export const BUNDLE_OFFER_STORAGE_KEY = 'e1d_bundle_offer_v1';
export const BUNDLE_RULES_STORAGE_KEY = 'e1d_bundle_rules_v2';

function newRuleId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `rule-${Date.now()}`;
}

const DEFAULT_TARTE_RULE: Omit<BundleOfferRule, 'id'> = {
  name: 'Offre lot (tartes)',
  enabled: true,
  bundleSize: 5,
  discountedUnitPrice: 3,
  useFixedBundleTotal: true,
  fixedBundleTotal: 15,
  appliesTo: 'particulier',
  productKinds: ['tarte'],
  dessertIds: [],
};

export const DEFAULT_BUNDLE_RULES: BundleOfferRule[] = [
  { id: 'default-tarte-1', ...DEFAULT_TARTE_RULE },
];

function normalizeRule(p: Partial<BundleOfferRule>, fallback: BundleOfferRule): BundleOfferRule {
  const allowed: DessertProductKind[] = ['tarte', 'flan', 'tiramisu', 'autre'];
  const rawKinds = p.productKinds;
  const kinds: DessertProductKind[] = Array.isArray(rawKinds)
    ? (rawKinds.filter((k): k is DessertProductKind => typeof k === 'string' && (allowed as string[]).includes(k)) as DessertProductKind[])
    : [];
  const rawIds = p.dessertIds;
  const ids = Array.isArray(rawIds) ? rawIds.filter((x): x is string => typeof x === 'string' && x.length > 0) : [];
  return {
    id: typeof p.id === 'string' && p.id ? p.id : newRuleId(),
    name: typeof p.name === 'string' ? p.name : fallback.name,
    enabled: Boolean(p.enabled),
    bundleSize: Math.max(2, Math.min(50, Math.floor(Number(p.bundleSize)) || fallback.bundleSize)),
    discountedUnitPrice: Math.max(0, Number(p.discountedUnitPrice) || fallback.discountedUnitPrice),
    useFixedBundleTotal: typeof p.useFixedBundleTotal === 'boolean' ? p.useFixedBundleTotal : fallback.useFixedBundleTotal,
    fixedBundleTotal: Math.max(0, Number(p.fixedBundleTotal) || fallback.fixedBundleTotal),
    appliesTo: p.appliesTo === 'pro' || p.appliesTo === 'both' || p.appliesTo === 'particulier' ? p.appliesTo : 'particulier',
    productKinds: kinds,
    dessertIds: ids,
  };
}

/**
 * @deprecated Préférer `loadBundleRules` — chargement ancien monolithique
 */
function migrateV1toRules(): BundleOfferRule[] {
  try {
    const raw = localStorage.getItem(BUNDLE_OFFER_STORAGE_KEY);
    if (!raw) return DEFAULT_BUNDLE_RULES.map(r => ({ ...r }));
    const p = JSON.parse(raw) as {
      enabled?: boolean;
      bundleSize?: number;
      discountedUnitPrice?: number;
      useFixedBundleTotal?: boolean;
      fixedBundleTotal?: number;
      appliesTo?: string;
      appliesToProductKinds?: string[];
    };
    const allowed: DessertProductKind[] = ['tarte', 'flan', 'tiramisu', 'autre'];
    const kinds = Array.isArray(p.appliesToProductKinds)
      ? p.appliesToProductKinds.filter((k): k is DessertProductKind => (allowed as string[]).includes(k as string))
      : (['tarte'] as DessertProductKind[]);
    const r: Partial<BundleOfferRule> = {
      id: 'migrated-v1',
      name: 'Offre lot (import)',
      enabled: p.enabled !== false,
      bundleSize: p.bundleSize,
      discountedUnitPrice: p.discountedUnitPrice,
      useFixedBundleTotal: p.useFixedBundleTotal,
      fixedBundleTotal: p.fixedBundleTotal,
      appliesTo: p.appliesTo as BundleOfferRule['appliesTo'],
      productKinds: kinds.length ? kinds : ['tarte'],
      dessertIds: [],
    };
    return [normalizeRule(r, DEFAULT_BUNDLE_RULES[0])];
  } catch {
    return DEFAULT_BUNDLE_RULES.map(x => ({ ...x }));
  }
}

export function loadBundleRules(): BundleOfferRule[] {
  try {
    const v2 = localStorage.getItem(BUNDLE_RULES_STORAGE_KEY);
    if (v2) {
      const arr = JSON.parse(v2) as unknown;
      if (Array.isArray(arr) && arr.length > 0) {
        const base = DEFAULT_BUNDLE_RULES[0];
        return arr.map((x) => normalizeRule((x as Partial<BundleOfferRule>) ?? {}, base));
      }
    }
    const migrated = migrateV1toRules();
    saveBundleRules(migrated);
    return migrated;
  } catch {
    return DEFAULT_BUNDLE_RULES.map(x => ({ ...x }));
  }
}

export function saveBundleRules(rules: BundleOfferRule[]): void {
  localStorage.setItem(BUNDLE_RULES_STORAGE_KEY, JSON.stringify(rules));
}

function customerMatches(r: BundleOfferRule, customerType: 'particulier' | 'pro'): boolean {
  return (
    r.appliesTo === 'both' ||
    (r.appliesTo === 'particulier' && customerType === 'particulier') ||
    (r.appliesTo === 'pro' && customerType === 'pro')
  );
}

/** Périmètre non vide : au moins une coche famille ou un dessert. */
function ruleHasScope(r: BundleOfferRule): boolean {
  return r.productKinds.length > 0 || r.dessertIds.length > 0;
}

/** Dessert couvert par la règle (union id ∪ famille). */
export function ruleMatchesDessert(r: BundleOfferRule, d: Dessert): boolean {
  if (!r.enabled || r.bundleSize < 2) return false;
  if (!ruleHasScope(r)) return false;
  if (r.dessertIds.length > 0 && r.dessertIds.includes(d.id)) return true;
  if (r.productKinds.length > 0 && r.productKinds.includes(d.productKind)) return true;
  return false;
}

/**
 * Première règle éligible (ordre du tableau = priorité).
 */
export function resolveRuleForDessert(
  d: Dessert,
  customerType: 'particulier' | 'pro',
  rules: BundleOfferRule[],
): BundleOfferRule | null {
  for (const r of rules) {
    if (!customerMatches(r, customerType)) continue;
    if (ruleMatchesDessert(r, d)) return r;
  }
  return null;
}

/** Ids de desserts apparaissant dans ≥ 2 règles (même inactives : à traiter côté UI). */
export function findDuplicateDessertIdsInRules(rules: BundleOfferRule[]): string[] {
  const count = new Map<string, number>();
  for (const r of rules) {
    const seen = new Set(r.dessertIds);
    for (const id of seen) {
      count.set(id, (count.get(id) ?? 0) + 1);
    }
  }
  return [...count.entries()].filter(([, n]) => n > 1).map(([id]) => id);
}

/**
 * @deprecated — utiliser `resolveRuleForDessert` + vérification `!== null`
 */
export function isBundleOfferApplicable(
  rules: BundleOfferRule[],
  customerType: 'particulier' | 'pro',
  d: Dessert,
): boolean {
  return resolveRuleForDessert(d, customerType, rules) !== null;
}

export function computeBundleLineTotal(
  quantity: number,
  unitPrice: number,
  rule: BundleOfferRule | null,
  _customerType: 'particulier' | 'pro',
  _productKind: DessertProductKind = 'tarte',
): number {
  if (quantity <= 0 || !Number.isFinite(unitPrice)) return 0;
  if (!rule) return unitPrice * quantity;

  const n = rule.bundleSize;
  const full = Math.floor(quantity / n);
  const rem = quantity % n;
  let perBundle: number;
  if (rule.useFixedBundleTotal && rule.fixedBundleTotal > 0) {
    perBundle = rule.fixedBundleTotal;
  } else {
    const promo = Math.max(0, rule.discountedUnitPrice);
    perBundle = (n - 1) * unitPrice + promo;
  }
  return full * perBundle + rem * unitPrice;
}

export function effectiveAverageUnitPrice(
  quantity: number,
  unitPrice: number,
  rule: BundleOfferRule | null,
  customerType: 'particulier' | 'pro',
  productKind: DessertProductKind = 'tarte',
): number {
  if (quantity <= 0) return 0;
  const t = computeBundleLineTotal(quantity, unitPrice, rule, customerType, productKind);
  return t / quantity;
}

export function unitRevenueListForBundle(
  count: number,
  catalogueUnit: number,
  rule: BundleOfferRule | null,
  _customerType: 'particulier' | 'pro',
  _productKind: DessertProductKind,
): number[] {
  if (count <= 0) return [];
  if (!rule) {
    return Array.from({ length: count }, () => catalogueUnit);
  }
  const n = rule.bundleSize;
  let perBundle: number;
  if (rule.useFixedBundleTotal && rule.fixedBundleTotal > 0) {
    perBundle = rule.fixedBundleTotal;
  } else {
    perBundle = (n - 1) * catalogueUnit + Math.max(0, rule.discountedUnitPrice);
  }
  const unitInLot = perBundle / n;
  const inBundle = Math.floor(count / n) * n;
  return Array.from({ length: count }, (_, k) => (k < inBundle ? unitInLot : catalogueUnit));
}

export function formatRevenueLineCaption(unitPrices: number[]): string {
  if (unitPrices.length === 0) return '';
  const byKey = new Map<number, { euros: number; n: number }>();
  for (const p of unitPrices) {
    const c = Math.round(p * 100);
    const prev = byKey.get(c);
    if (prev) prev.n += 1;
    else byKey.set(c, { euros: c / 100, n: 1 });
  }
  const sorted = [...byKey.entries()].sort((a, b) => a[0] - b[0]);
  const parts = sorted.map(([, { euros, n }]) => (n > 1 ? `${n} × ${fmt(euros)}` : `1 × ${fmt(euros)}`));
  return parts.join(' + ');
}

/** Libellé compta / ticket (figé à la vente). */
export function formatBundleOfferLabel(rule: BundleOfferRule | null): string {
  if (!rule) return '';
  const n = rule.bundleSize;
  if (rule.useFixedBundleTotal && rule.fixedBundleTotal > 0) {
    return rule.name.trim() || `Offre lot ${n} p. = ${fmt(rule.fixedBundleTotal)}`;
  }
  return (
    rule.name.trim() || `Offre lot ${n} p. (nᵉ unité ${fmt(rule.discountedUnitPrice)})`
  );
}

function kindNounPl(productKind: DessertProductKind): string {
  switch (productKind) {
    case 'tarte':
      return 'tartes';
    case 'flan':
      return 'flans';
    case 'tiramisu':
      return 'tiramisu';
    default:
      return 'pièces';
  }
}

export function getBundleDecompositionForDisplay(
  quantity: number,
  catalogueUnit: number,
  rule: BundleOfferRule | null,
  customerType: 'particulier' | 'pro',
  dessert: Dessert,
):
  | { applicable: true; segments: { title: string; detail: string; subtotal: number }[]; total: number; unitInLot: number }
  | { applicable: false; simpleLine: string; total: number } {
  const productKind = dessert.productKind;
  if (quantity <= 0 || !Number.isFinite(catalogueUnit)) {
    return { applicable: false, simpleLine: '', total: 0 };
  }
  if (!rule || !customerMatches(rule, customerType) || !ruleMatchesDessert(rule, dessert)) {
    return {
      applicable: false,
      simpleLine: `${quantity} ${kindNounPl(productKind)} au catalogue : ${fmt(catalogueUnit)}/u`,
      total: quantity * catalogueUnit,
    };
  }
  const n = rule.bundleSize;
  const full = Math.floor(quantity / n);
  const rem = quantity % n;
  const inLot = full * n;
  const nouns = kindNounPl(productKind);
  let perBundle: number;
  if (rule.useFixedBundleTotal && rule.fixedBundleTotal > 0) {
    perBundle = rule.fixedBundleTotal;
  } else {
    perBundle = (n - 1) * catalogueUnit + Math.max(0, rule.discountedUnitPrice);
  }
  const unitInLot = perBundle / n;
  const lotSub = full * perBundle;
  const remSub = rem * catalogueUnit;
  const segments: { title: string; detail: string; subtotal: number }[] = [];
  if (inLot > 0) {
    const lotsLabel = full > 1 ? `${full} lots de ${n} ${nouns}` : `1 lot de ${n} ${nouns}`;
    segments.push({
      title: lotsLabel,
      detail: `Soit ${inLot} ${nouns} en tarif offre (équivalent ${fmt(unitInLot)}/u en moyenne sur ce bloc) : ${full} × ${fmt(perBundle)} = ${fmt(lotSub)}`,
      subtotal: lotSub,
    });
  }
  if (rem > 0) {
    const unitW =
      productKind === 'tarte'
        ? rem === 1
          ? 'tarte'
          : 'tartes'
        : productKind === 'tiramisu'
          ? 'tiramisu'
          : rem === 1
            ? nouns.replace(/s$/, '') || 'pièce'
            : nouns;
    segments.push({
      title: 'Reliquat (hors lot complet)',
      detail: `${rem} ${unitW} au prix catalogue : ${rem} × ${fmt(catalogueUnit)} = ${fmt(remSub)}`,
      subtotal: remSub,
    });
  }
  return {
    applicable: true,
    segments: segments,
    total: lotSub + remSub,
    unitInLot,
  };
}

export function newEmptyBundleRule(): BundleOfferRule {
  return normalizeRule(
    { ...DEFAULT_TARTE_RULE, id: newRuleId(), name: 'Nouvelle offre' },
    DEFAULT_BUNDLE_RULES[0],
  );
}
