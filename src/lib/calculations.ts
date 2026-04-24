import { RawIngredient, Base, Dessert, SnapshotLine, HistoryEntry, StatPeriod } from '../types';

// ─── Formatage ─────────────────────────────────────────────

export const fmt = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value || 0);

export const fmtPct = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 }).format(value || 0);

// ─── Lookup ────────────────────────────────────────────────

export const findIngredient = (ingredients: RawIngredient[], id: string) =>
  ingredients.find(i => i.id === id);

export const findBase = (bases: Base[], id: string) =>
  bases.find(b => b.id === id);

// ─── Coût d'une Base ───────────────────────────────────────

export const calculateBaseCost = (base: Base, ingredients: RawIngredient[]) => {
  let totalCost = 0;
  let totalWeight = 0;
  base.components.forEach(comp => {
    const ing = findIngredient(ingredients, comp.ingredientId);
    if (!ing) return;
    const price = ing.pricePerKg;
    // Pour les unités, comp.quantity est déjà en unités, prix = prix/unité
    if (ing.unit === 'u') {
      totalCost += price * comp.quantity;
    } else {
      // kg ou L : comp.quantity est en g ou ml
      totalCost += (price * comp.quantity) / 1000;
    }
    totalWeight += comp.quantity;
  });
  return { totalCost, totalWeight };
};

export const calculateBaseCostPerKg = (base: Base, ingredients: RawIngredient[]) => {
  const { totalCost, totalWeight } = calculateBaseCost(base, ingredients);
  return totalWeight > 0 ? (totalCost / totalWeight) * 1000 : 0;
};

// ─── Coût d'un Dessert ─────────────────────────────────────

export const calculateDessertCost = (dessert: Dessert, ingredients: RawIngredient[], bases: Base[]) => {
  let cost = 0;
  dessert.components.forEach(comp => {
    if (comp.type === 'ingredient') {
      const ing = findIngredient(ingredients, comp.id);
      if (!ing) return;
      if (ing.unit === 'u') {
        cost += ing.pricePerKg * comp.quantity;
      } else {
        cost += (ing.pricePerKg * comp.quantity) / 1000;
      }
    } else {
      const base = findBase(bases, comp.id);
      if (!base) return;
      const costPerKg = calculateBaseCostPerKg(base, ingredients);
      cost += (costPerKg * comp.quantity) / 1000;
    }
  });
  return cost;
};

// ─── Résolution de noms ────────────────────────────────────

export const resolveComponentName = (
  type: 'ingredient' | 'base',
  id: string,
  ingredients: RawIngredient[],
  bases: Base[]
): string => {
  if (type === 'ingredient') {
    return findIngredient(ingredients, id)?.name || 'Inconnu';
  }
  return findBase(bases, id)?.name || 'Inconnu';
};

/** Emoji de la matière première ou de la base (pour listes de composition). */
export const resolveComponentEmoji = (
  type: 'ingredient' | 'base',
  id: string,
  ingredients: RawIngredient[],
  bases: Base[]
): string => {
  if (type === 'ingredient') {
    return findIngredient(ingredients, id)?.emoji ?? '🥄';
  }
  return findBase(bases, id)?.emoji ?? '🍯';
};

export const resolveComponentUnit = (
  type: 'ingredient' | 'base',
  id: string,
  ingredients: RawIngredient[]
): string => {
  if (type === 'ingredient') {
    const ing = findIngredient(ingredients, id);
    if (!ing) return 'g';
    if (ing.unit === 'L') return 'ml';
    if (ing.unit === 'u') return 'u';
    return 'g';
  }
  return 'g'; // Base always measured in grams
};

// ─── Snapshot Complet (immutable) ──────────────────────────

export const createFullSnapshot = (
  dessert: Dessert,
  ingredients: RawIngredient[],
  bases: Base[]
): SnapshotLine[] => {
  return dessert.components.map(comp => {
    const name = resolveComponentName(comp.type, comp.id, ingredients, bases);
    const unitLabel = resolveComponentUnit(comp.type, comp.id, ingredients);

    let unitCostPerKg = 0;
    let lineCost = 0;

    if (comp.type === 'ingredient') {
      const ing = findIngredient(ingredients, comp.id);
      if (ing) {
        unitCostPerKg = ing.pricePerKg;
        if (ing.unit === 'u') {
          lineCost = ing.pricePerKg * comp.quantity;
        } else {
          lineCost = (ing.pricePerKg * comp.quantity) / 1000;
        }
      }
    } else {
      const base = findBase(bases, comp.id);
      if (base) {
        unitCostPerKg = calculateBaseCostPerKg(base, ingredients);
        lineCost = (unitCostPerKg * comp.quantity) / 1000;
      }
    }

    return {
      name,
      type: comp.type,
      quantity: comp.quantity,
      unitLabel,
      unitCostPerKg,
      lineCost,
    };
  });
};

// ─── Filtrage par période ──────────────────────────────────

export function filterHistoryByPeriod(history: HistoryEntry[], period: StatPeriod): HistoryEntry[] {
  if (period === 'all') return history;
  const cutoff = new Date();
  if (period === 'week') cutoff.setDate(cutoff.getDate() - 7);
  if (period === 'month') cutoff.setMonth(cutoff.getMonth() - 1);
  const cutoffISO = cutoff.toISOString();
  return history.filter(h => h.date >= cutoffISO);
}

export function filterHistoryByCustomerType(
  history: HistoryEntry[],
  customerType: 'all' | 'particulier' | 'pro'
): HistoryEntry[] {
  if (customerType === 'all') return history;
  return history.filter(h => h.customerType === customerType);
}

// ─── Comptabilité — Stats Globales ─────────────────────────

interface DessertStatsEntry {
  name: string;
  emoji: string;
  count: number;
  profit: number;
}

export interface GlobalStats {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  marginRate: number;
  totalSales: number;
  totalDessertsSold: number;
  avgMarginPerSale: number;
  topVolume: { name: string; count: number } | null;
  topProfit: { name: string; profit: number } | null;
  top3Profit: Array<{ name: string; emoji: string; profit: number; count: number }> | null;
}

export const computeGlobalStats = (history: HistoryEntry[]): GlobalStats => {
  if (history.length === 0) {
    return {
      totalRevenue: 0, totalCost: 0, totalProfit: 0, marginRate: 0,
      totalSales: 0, totalDessertsSold: 0, avgMarginPerSale: 0,
      topVolume: null, topProfit: null, top3Profit: null,
    };
  }

  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let totalDessertsSold = 0;

  const dessertMap = new Map<string, DessertStatsEntry>();

  history.forEach(h => {
    totalRevenue += h.totalRevenue;
    totalCost += h.totalCost;
    totalProfit += h.totalProfit;
    totalDessertsSold += h.quantitySold;

    const existing = dessertMap.get(h.dessertId) ?? { name: h.dessertName, emoji: h.dessertEmoji, count: 0, profit: 0 };
    existing.count += h.quantitySold;
    existing.profit += h.totalProfit;
    dessertMap.set(h.dessertId, existing);
  });

  const allEntries = Array.from(dessertMap.values());
  const sortedByProfit = [...allEntries].sort((a, b) => b.profit - a.profit);
  const sortedByVolume = [...allEntries].sort((a, b) => b.count - a.count);

  const topVolume = sortedByVolume[0] ? { name: sortedByVolume[0].name, count: sortedByVolume[0].count } : null;
  const topProfit = sortedByProfit[0] ? { name: sortedByProfit[0].name, profit: sortedByProfit[0].profit } : null;
  const top3Profit = sortedByProfit.length > 0
    ? sortedByProfit.slice(0, 3).map(d => ({ name: d.name, emoji: d.emoji, profit: d.profit, count: d.count }))
    : null;

  return {
    totalRevenue,
    totalCost,
    totalProfit,
    marginRate: totalRevenue > 0 ? totalProfit / totalRevenue : 0,
    totalSales: history.length,
    totalDessertsSold,
    avgMarginPerSale: history.length > 0 ? totalProfit / history.length : 0,
    topVolume,
    topProfit,
    top3Profit,
  };
};
