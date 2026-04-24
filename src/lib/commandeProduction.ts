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
