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
  sellPrice: number;         // Prix de vente
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
}

export interface Commande {
  id: string;
  clientName: string;
  items: CommandeItem[];        // plusieurs desserts
  orderDate: string;            // Date de prise de commande (ISO)
  deliveryDate: string;         // Date de livraison souhaitée (ISO)
  notes: string;
  status: CommandeStatus;
  notifyBefore: NotifyBefore[]; // [0]=jour même, [1]=1j avant, [2]=2j avant
  createdAt: string;
}

// ─── Stats ─────────────────────────────────────────────────
export type StatPeriod = 'week' | 'month' | 'all';

// ─── Toast ─────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info';
export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}
