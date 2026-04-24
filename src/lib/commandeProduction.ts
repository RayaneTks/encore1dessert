import type { Commande, CommandeItem } from '../types';

export function productionKey(item: CommandeItem): string | null {
  if (item.dessertId) return `id:${item.dessertId}`;
  const n = item.dessertName.trim();
  if (!n) return null;
  return `name:${n.toLowerCase()}`;
}

export function clampProducedQty(item: CommandeItem): number {
  const q = Math.max(0, Math.floor(item.quantity));
  const raw = item.producedQty ?? 0;
  const p = Math.max(0, Math.floor(raw));
  return Math.min(q, p);
}

export function normalizeCommandeItem(item: CommandeItem): CommandeItem {
  const q = Math.max(1, Math.floor(item.quantity) || 1);
  const p = clampProducedQty({ ...item, quantity: q });
  return { ...item, quantity: q, producedQty: p };
}

export function normalizeCommandeItems(items: CommandeItem[]): CommandeItem[] {
  return items.map(normalizeCommandeItem);
}

/**
 * Fusionne les lignes du même dessert (même id ou même nom) : une seule ligne avec quantité totale
 * et production cumulée (somme des unités déjà cochées, plafonnée au total).
 */
export function mergeCommandeItems(items: CommandeItem[]): CommandeItem[] {
  const valid = items.filter(i => i.dessertName.trim());
  const groups = new Map<string, CommandeItem[]>();
  for (const it of valid) {
    const k = productionKey(it);
    if (!k) continue;
    const g = groups.get(k) ?? [];
    g.push(it);
    groups.set(k, g);
  }
  const out: CommandeItem[] = [];
  for (const [, group] of groups) {
    const totalQ = group.reduce((s, x) => s + Math.max(0, Math.floor(x.quantity)), 0);
    const sumP = group.reduce((s, x) => s + clampProducedQty(x), 0);
    const totalP = Math.min(Math.max(0, totalQ), sumP);
    const ref = group[0];
    out.push(
      normalizeCommandeItem({
        ...ref,
        quantity: Math.max(1, totalQ || 1),
        producedQty: totalP,
      }),
    );
  }
  out.sort((a, b) => a.dessertName.localeCompare(b.dessertName, 'fr'));
  return out;
}

/** Lignes de production : commandes encore à préparer (hors livrées). */
export function activeProductionCommandes(commandes: Commande[]): Commande[] {
  return commandes.filter(c => c.status !== 'delivered');
}

export function itemRemaining(item: CommandeItem): number {
  const q = Math.max(0, Math.floor(item.quantity));
  return Math.max(0, q - clampProducedQty(item));
}

export function commandeProductionComplete(cmd: Commande): boolean {
  if (cmd.status === 'delivered') return true;
  const items = cmd.items.filter(i => i.dessertName.trim());
  if (items.length === 0) return false;
  return items.every(it => clampProducedQty(it) >= Math.max(0, Math.floor(it.quantity)));
}

export function totalDessertsRemaining(commandes: Commande[]): number {
  let s = 0;
  for (const cmd of commandes) {
    if (cmd.status !== 'pending') continue;
    for (const it of cmd.items) {
      if (!it.dessertName.trim()) continue;
      s += itemRemaining(it);
    }
  }
  return s;
}

export function totalDessertsOrdered(commandes: Commande[]): number {
  let s = 0;
  for (const cmd of commandes) {
    if (cmd.status !== 'pending') continue;
    for (const it of cmd.items) {
      if (!it.dessertName.trim()) continue;
      s += Math.max(0, Math.floor(it.quantity));
    }
  }
  return s;
}

export type KitchenGroupedLine = {
  commandeId: string;
  clientName: string;
  deliveryDate: string;
  itemIndex: number;
  item: CommandeItem;
};

export function kitchenLinesByDessert(commandes: Commande[]): Map<string, KitchenGroupedLine[]> {
  const map = new Map<string, KitchenGroupedLine[]>();
  for (const cmd of commandes) {
    if (cmd.status !== 'pending') continue;
    cmd.items.forEach((item, itemIndex) => {
      if (!item.dessertName.trim()) return;
      const key = productionKey(item);
      if (!key) return;
      const row: KitchenGroupedLine = {
        commandeId: cmd.id,
        clientName: cmd.clientName,
        deliveryDate: cmd.deliveryDate,
        itemIndex,
        item,
      };
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    });
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate) || a.clientName.localeCompare(b.clientName, 'fr'));
  }
  return map;
}

export function dessertLabelForKey(key: string, lines: KitchenGroupedLine[]): { name: string; emoji: string } {
  const first = lines[0]?.item;
  return {
    name: first?.dessertName?.trim() || 'Dessert',
    emoji: first?.dessertEmoji?.trim() || '🍰',
  };
}

/** Au-delà de ce nombre d’unités, l’UI cuisine utilise un compteur +/- au lieu d’une rangée de cercles. */
export const KITCHEN_UNIT_CIRCLES_MAX = 10;
