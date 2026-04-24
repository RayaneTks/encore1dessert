import type { BundleOfferConfig } from '../types';

export const BUNDLE_OFFER_STORAGE_KEY = 'e1d_bundle_offer_v1';

/** Défaut : lot de 5 à 15 € (ex. 4 × 3,60 € + 1 €), reliquat au catalogue — Particulier uniquement. */
export const DEFAULT_BUNDLE_OFFER: BundleOfferConfig = {
  enabled: true,
  bundleSize: 5,
  discountedUnitPrice: 1,
  useFixedBundleTotal: true,
  fixedBundleTotal: 15,
  appliesTo: 'particulier',
};

export function loadBundleOffer(): BundleOfferConfig {
  try {
    const raw = localStorage.getItem(BUNDLE_OFFER_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BUNDLE_OFFER };
    const p = JSON.parse(raw) as Partial<BundleOfferConfig>;
    return {
      enabled: Boolean(p.enabled),
      bundleSize: Math.max(2, Math.min(50, Math.floor(Number(p.bundleSize)) || DEFAULT_BUNDLE_OFFER.bundleSize)),
      discountedUnitPrice: Math.max(0, Number(p.discountedUnitPrice) || DEFAULT_BUNDLE_OFFER.discountedUnitPrice),
      useFixedBundleTotal: typeof p.useFixedBundleTotal === 'boolean' ? p.useFixedBundleTotal : DEFAULT_BUNDLE_OFFER.useFixedBundleTotal,
      fixedBundleTotal: Math.max(0, Number(p.fixedBundleTotal) || DEFAULT_BUNDLE_OFFER.fixedBundleTotal),
      appliesTo: p.appliesTo === 'pro' || p.appliesTo === 'both' ? p.appliesTo : 'particulier',
    };
  } catch {
    return { ...DEFAULT_BUNDLE_OFFER };
  }
}

export function saveBundleOffer(config: BundleOfferConfig): void {
  localStorage.setItem(BUNDLE_OFFER_STORAGE_KEY, JSON.stringify(config));
}

/**
 * Chaque lot complet de `bundleSize` unités :
 * - si `useFixedBundleTotal` : total du lot = `fixedBundleTotal` ;
 * - sinon : (bundleSize − 1) × `unitPrice` + `discountedUnitPrice`.
 * Le reliquat (quantité % bundleSize) est facturé au prix catalogue unitaire.
 */
export function computeBundleLineTotal(
  quantity: number,
  unitPrice: number,
  config: BundleOfferConfig,
  customerType: 'particulier' | 'pro',
): number {
  if (quantity <= 0 || !Number.isFinite(unitPrice)) return 0;
  if (!config.enabled || config.bundleSize < 2) return unitPrice * quantity;
  const applies =
    config.appliesTo === 'both' ||
    (config.appliesTo === 'particulier' && customerType === 'particulier') ||
    (config.appliesTo === 'pro' && customerType === 'pro');
  if (!applies) return unitPrice * quantity;

  const n = config.bundleSize;
  const full = Math.floor(quantity / n);
  const rem = quantity % n;
  let perBundle: number;
  if (config.useFixedBundleTotal && config.fixedBundleTotal > 0) {
    perBundle = config.fixedBundleTotal;
  } else {
    const promo = Math.max(0, config.discountedUnitPrice);
    perBundle = (n - 1) * unitPrice + promo;
  }
  return full * perBundle + rem * unitPrice;
}

/** Prix moyen pondéré (pour historique / affichage CA unitaire équivalent). */
export function effectiveAverageUnitPrice(
  quantity: number,
  unitPrice: number,
  config: BundleOfferConfig,
  customerType: 'particulier' | 'pro',
): number {
  if (quantity <= 0) return 0;
  const t = computeBundleLineTotal(quantity, unitPrice, config, customerType);
  return t / quantity;
}
