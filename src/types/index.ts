// ─── Navigation ────────────────────────────────────────────
export type Tab = 'calculate' | 'desserts' | 'bases' | 'ingredients' | 'history' | 'settings';

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

// ─── Toast ─────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info';
export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}
