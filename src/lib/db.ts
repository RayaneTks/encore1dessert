import { supabase } from './supabase';
import type { RawIngredient, Base, BaseComponent, Dessert, DessertComponent, HistoryEntry, SnapshotLine, Commande, CommandeStatus, CommandeItem, NotifyBefore } from '../types';

// ─── RAW INGREDIENTS ────────────────────────────────────────

export async function fetchIngredients(): Promise<RawIngredient[]> {
  const { data, error } = await supabase
    .from('raw_ingredients')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    pricePerKg: Number(row.price_per_kg),
    unit: row.unit,
    category: row.category,
    emoji: row.emoji,
    purchaseLabel: row.purchase_label || '',
    notes: row.notes || '',
    createdAt: row.created_at,
  }));
}

export async function upsertIngredient(ing: RawIngredient): Promise<RawIngredient> {
  const isNew = ing.id.startsWith('ing-');
  const payload: any = {
    name: ing.name,
    price_per_kg: ing.pricePerKg,
    unit: ing.unit,
    category: ing.category,
    emoji: ing.emoji,
    purchase_label: ing.purchaseLabel,
    notes: ing.notes,
  };
  if (!isNew) payload.id = ing.id;

  const { data, error } = await supabase
    .from('raw_ingredients')
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    pricePerKg: Number(data.price_per_kg),
    unit: data.unit,
    category: data.category,
    emoji: data.emoji,
    purchaseLabel: data.purchase_label || '',
    notes: data.notes || '',
    createdAt: data.created_at,
  };
}

export async function deleteIngredient(id: string): Promise<void> {
  const { error } = await supabase.from('raw_ingredients').delete().eq('id', id);
  if (error) throw error;
}

// ─── BASES ──────────────────────────────────────────────────

export async function fetchBases(): Promise<Base[]> {
  const [basesRes, compsRes] = await Promise.all([
    supabase.from('bases').select('*').order('name'),
    supabase.from('base_components').select('*'),
  ]);
  if (basesRes.error) throw basesRes.error;
  if (compsRes.error) throw compsRes.error;

  return (basesRes.data || []).map(b => ({
    id: b.id,
    name: b.name,
    category: b.category,
    emoji: b.emoji,
    notes: b.notes || '',
    createdAt: b.created_at,
    components: (compsRes.data || [])
      .filter(c => c.base_id === b.id)
      .map(c => ({ ingredientId: c.ingredient_id, quantity: Number(c.quantity) })),
  }));
}

export async function upsertBase(base: Base): Promise<Base> {
  const isNew = base.id.startsWith('base-');
  const payload: any = {
    name: base.name,
    category: base.category,
    emoji: base.emoji,
    notes: base.notes,
  };
  if (!isNew) payload.id = base.id;

  const { data, error } = await supabase
    .from('bases')
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;

  const baseId = data.id;

  // Replace components: delete old, insert new
  await supabase.from('base_components').delete().eq('base_id', baseId);
  if (base.components.length > 0) {
    const rows = base.components.map(c => ({
      base_id: baseId,
      ingredient_id: c.ingredientId,
      quantity: c.quantity,
    }));
    const { error: compErr } = await supabase.from('base_components').insert(rows);
    if (compErr) throw compErr;
  }

  return { ...base, id: baseId, createdAt: data.created_at };
}

export async function deleteBase(id: string): Promise<void> {
  // base_components cascade on delete
  const { error } = await supabase.from('bases').delete().eq('id', id);
  if (error) throw error;
}

// ─── DESSERTS ───────────────────────────────────────────────

export async function fetchDesserts(): Promise<Dessert[]> {
  const [dessertsRes, compsRes] = await Promise.all([
    supabase.from('desserts').select('*').order('name'),
    supabase.from('dessert_components').select('*'),
  ]);
  if (dessertsRes.error) throw dessertsRes.error;
  if (compsRes.error) throw compsRes.error;

  return (dessertsRes.data || []).map(d => {
    const legacySellPrice = Number(d.sell_price ?? 0);
    const rawParticulier = Number(d.sell_price_particulier ?? 0);
    const rawPro = Number(d.sell_price_pro ?? 0);
    const sellPriceParticulier = rawParticulier > 0 ? rawParticulier : legacySellPrice;
    const sellPricePro = rawPro > 0 ? rawPro : legacySellPrice;

    return {
    id: d.id,
    name: d.name,
    emoji: d.emoji,
    sellPriceParticulier,
    sellPricePro,
    servings: d.servings,
    notes: d.notes || '',
    createdAt: d.created_at,
    components: (compsRes.data || [])
      .filter(c => c.dessert_id === d.id)
      .map(c => ({
        type: c.type as 'ingredient' | 'base',
        id: c.type === 'base' ? c.base_id : c.ingredient_id,
        quantity: Number(c.quantity),
      })),
  };
  });
}

export async function upsertDessert(dessert: Dessert): Promise<Dessert> {
  const isNew = dessert.id.startsWith('dessert-');
  const payload: any = {
    name: dessert.name,
    emoji: dessert.emoji,
    sell_price_particulier: dessert.sellPriceParticulier,
    sell_price_pro: dessert.sellPricePro,
    servings: dessert.servings,
    notes: dessert.notes,
  };
  if (!isNew) payload.id = dessert.id;

  const { data, error } = await supabase
    .from('desserts')
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;

  const dessertId = data.id;

  // Replace components: delete old, insert new
  await supabase.from('dessert_components').delete().eq('dessert_id', dessertId);
  if (dessert.components.length > 0) {
    const rows = dessert.components.map(c => ({
      dessert_id: dessertId,
      type: c.type,
      ingredient_id: c.type === 'ingredient' ? c.id : null,
      base_id: c.type === 'base' ? c.id : null,
      quantity: c.quantity,
    }));
    const { error: compErr } = await supabase.from('dessert_components').insert(rows);
    if (compErr) throw compErr;
  }

  return { ...dessert, id: dessertId, createdAt: data.created_at };
}

export async function deleteDessert(id: string): Promise<void> {
  const { error } = await supabase.from('desserts').delete().eq('id', id);
  if (error) throw error;
}

// ─── HISTORY ────────────────────────────────────────────────

export async function fetchHistory(): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from('history_entries')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(h => ({
    id: h.id,
    date: h.date,
    dessertId: h.dessert_id || '',
    dessertName: h.dessert_name,
    dessertEmoji: h.dessert_emoji,
    quantitySold: h.quantity_sold,
    unitCost: Number(h.unit_cost),
    unitPrice: Number(h.unit_price),
    customerType: (h.customer_type as 'particulier' | 'pro') || 'particulier',
    totalRevenue: Number(h.total_revenue),
    totalCost: Number(h.total_cost),
    totalProfit: Number(h.total_profit),
    marginRate: Number(h.margin_rate),
    linesSnapshot: h.lines_snapshot as SnapshotLine[],
  }));
}

export async function insertHistoryEntry(entry: {
  dessertId: string;
  dessertName: string;
  dessertEmoji: string;
  quantitySold: number;
  unitCost: number;
  unitPrice: number;
  customerType: 'particulier' | 'pro';
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  marginRate: number;
  linesSnapshot: SnapshotLine[];
}): Promise<HistoryEntry> {
  const { data, error } = await supabase
    .from('history_entries')
    .insert({
      dessert_id: entry.dessertId.startsWith('dessert-') ? null : entry.dessertId,
      dessert_name: entry.dessertName,
      dessert_emoji: entry.dessertEmoji,
      quantity_sold: entry.quantitySold,
      unit_cost: entry.unitCost,
      unit_price: entry.unitPrice,
      customer_type: entry.customerType,
      total_revenue: entry.totalRevenue,
      total_cost: entry.totalCost,
      total_profit: entry.totalProfit,
      margin_rate: entry.marginRate,
      lines_snapshot: entry.linesSnapshot,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    date: data.date,
    dessertId: data.dessert_id || '',
    dessertName: data.dessert_name,
    dessertEmoji: data.dessert_emoji,
    quantitySold: data.quantity_sold,
    unitCost: Number(data.unit_cost),
    unitPrice: Number(data.unit_price),
    customerType: (data.customer_type as 'particulier' | 'pro') || 'particulier',
    totalRevenue: Number(data.total_revenue),
    totalCost: Number(data.total_cost),
    totalProfit: Number(data.total_profit),
    marginRate: Number(data.margin_rate),
    linesSnapshot: data.lines_snapshot as SnapshotLine[],
  };
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const { error } = await supabase.from('history_entries').delete().eq('id', id);
  if (error) throw error;
}

// ─── COMMANDES ──────────────────────────────────────────────

function rowToCommande(row: any): Commande {
  return {
    id: row.id,
    clientName: row.client_name,
    items: (row.items as CommandeItem[]) || [],
    orderDate: row.order_date,
    deliveryDate: row.delivery_date,
    notes: row.notes || '',
    customerType: (row.customer_type as 'particulier' | 'pro') || 'particulier',
    status: row.status as CommandeStatus,
    notifyBefore: (row.notify_before as NotifyBefore[]) || [],
    createdAt: row.created_at,
  };
}

export async function fetchCommandes(): Promise<Commande[]> {
  const { data, error } = await supabase
    .from('commandes')
    .select('*')
    .order('delivery_date', { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToCommande);
}

export async function upsertCommande(commande: Commande): Promise<Commande> {
  const isNew = commande.id.startsWith('cmd-');
  const payload: any = {
    client_name: commande.clientName,
    items: commande.items,
    order_date: commande.orderDate,
    delivery_date: commande.deliveryDate,
    notes: commande.notes,
    customer_type: commande.customerType,
    status: commande.status,
    notify_before: commande.notifyBefore,
  };
  if (!isNew) payload.id = commande.id;

  const { data, error } = await supabase
    .from('commandes')
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return rowToCommande(data);
}

export async function deleteCommande(id: string): Promise<void> {
  const { error } = await supabase.from('commandes').delete().eq('id', id);
  if (error) throw error;
}
