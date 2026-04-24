// ─── Navigation ────────────────────────────────────────────
export type Tab = 'calculate' | 'desserts' | 'bases' | 'ingredients' | 'history' | 'commandes' | 'settings';

// ─── Matières Premières (Achats) ───────────────────────────
export interface RawIngredient {
  id: string;
  name: string;
  pricePerKg: number;       // Prix normalisé au kg/L/unité
  unit: 'kg' | 'L' | 'u';
  category: string;         // Crèmerie, Épicerie, Fruits secs…
  emoji: string;
  purchaseLabel: string;    // Ex: "9,96 €/kg — Plaquettes"
  notes: string;
  createdAt: string;
}

// ─── Bases / Préparations Maison ───────────────────────────
export interface BaseComponent {
  ingredientId: string;
  quantity: number;          // en grammes / ml / unités
}

export interface Base {
  id: string;
  name: string;
  components: BaseComponent[];
  category: string;          // Fond, Ganache, Insert, Coulis, Crème…
  emoji: string;
  notes: string;
  createdAt: string;
}

// ─── Desserts / Produits Finis ─────────────────────────────
export interface DessertComponent {
  type: 'ingredient' | 'base';
  id: string;
  quantity: number;          // en grammes
}

export interface Dessert {
  id: string;
  name: string;
  components: DessertComponent[];
  emoji: string;
  sellPriceParticulier: number; // Prix de vente Particulier
  sellPricePro: number;         // Prix de vente Pro
  servings: number;          // Nombre de parts
  notes: string;
  createdAt: string;
}

// ─── Historique / Comptabilité ─────────────────────────────
export interface SnapshotLine {
  name: string;
  type: 'ingredient' | 'base';
  quantity: number;
  unitLabel: string;         // "g", "ml", "u"
  unitCostPerKg: number;     // Prix/kg figé au moment de la vente
  lineCost: number;          // Coût calculé figé
}

export interface HistoryEntry {
  id: string;
  date: string;
  dessertId: string;
  dessertName: string;
  dessertEmoji: string;
  quantitySold: number;
  unitCost: number;          // Coût de revient unitaire figé
  unitPrice: number;         // Prix de vente unitaire figé
  customerType: 'particulier' | 'pro';
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  marginRate: number;        // % marge
  linesSnapshot: SnapshotLine[];  // Détail figé complet
}

// ─── Commandes Client ──────────────────────────────────────
export type CommandeStatus = 'pending' | 'ready' | 'delivered';
export type NotifyBefore = 0 | 1 | 2; // jours avant livraison

export interface CommandeItem {
  dessertId: string | null;
  dessertName: string;
  dessertEmoji: string;
  quantity: number;
  /** Unités déjà fabriquées (0…quantity). Absent en base = 0. */
  producedQty?: number;
}

export interface Commande {
  id: string;
  clientName: string;
  items: CommandeItem[];        // plusieurs desserts
  orderDate: string;            // Date de prise de commande (ISO)
  deliveryDate: string;         // Date de livraison souhaitée (ISO)
  notes: string;
  customerType: 'particulier' | 'pro';
  status: CommandeStatus;
  notifyBefore: NotifyBefore[]; // [0]=jour même, [1]=1j avant, [2]=2j avant
  createdAt: string;
}

// ─── Offre lot (caisse) — stockée en localStorage ──────────
/**
 * Offre « lot » à la caisse.
 * - Sans forfait : chaque lot complet = (bundleSize − 1) × prix catalogue + `discountedUnitPrice`.
 * - Avec forfait : chaque lot complet = `fixedBundleTotal` (ex. 15 € pour 5 tartes), le reste au prix catalogue.
 */
export interface BundleOfferConfig {
  enabled: boolean;
  bundleSize: number;
  /** Prix de la dernière unité de chaque lot (ex. 1 €) si `useFixedBundleTotal` est false. */
  discountedUnitPrice: number;
  /** Si true : `fixedBundleTotal` € par lot complet de `bundleSize` unités, puis reliquat au catalogue. */
  useFixedBundleTotal: boolean;
  /** Total TTC d’un lot complet (ex. 15 pour 5 × 3 € moyen). Ignoré si `useFixedBundleTotal` est false. */
  fixedBundleTotal: number;
  /** Particulier, Pro, ou les deux */
  appliesTo: 'particulier' | 'pro' | 'both';
}

// ─── Stats ─────────────────────────────────────────────────
export type StatPeriod = 'week' | 'month' | 'all';

// ─── Toast ─────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info';

/** Options du toast (3e argument de `showToast`). */
export interface ShowToastOptions {
  emphasis?: string;
}

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  /** Affiché en gras au-dessus du message (ex. nom client). */
  emphasis?: string;
}
