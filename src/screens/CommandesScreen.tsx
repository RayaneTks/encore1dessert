import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Check, Package, Clock, ChevronRight, Bell, BellOff, X, ChefHat } from 'lucide-react';
import { Commande, CommandeItem, CommandeStatus, NotifyBefore, Dessert } from '../types';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { IconActionButton } from '../components/IconActionButton';
import { FormLabel } from '../components/FormLabel';
import {
  requestNotificationPermission,
  getNotificationPermission,
  isNotificationSupported,
} from '../lib/notifications';

interface Props {
  commandes: Commande[];
  desserts: Dessert[];
  onSave: (cmd: Commande) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddSale: (dessert: Dessert, quantity: number, customerType: 'particulier' | 'pro') => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const STATUS_LABEL: Record<CommandeStatus, string> = {
  pending: 'En attente',
  ready: 'Prête',
  delivered: 'Livrée',
};

const STATUS_NEXT: Record<CommandeStatus, CommandeStatus | null> = {
  pending: 'ready',
  ready: 'delivered',
  delivered: null,
};

const STATUS_NEXT_LABEL: Record<CommandeStatus, string> = {
  pending: 'Marquer Prête',
  ready: 'Marquer Livrée',
  delivered: '',
};

const NOTIFY_OPTIONS: { value: NotifyBefore; label: string }[] = [
  { value: 2, label: '2 jours avant' },
  { value: 1, label: '1 jour avant' },
  { value: 0, label: 'Jour même (8h)' },
];

function urgencyClass(deliveryDate: string, status: CommandeStatus): string {
  if (status === 'delivered') return 'border-gray-100 bg-gray-50/50 opacity-60';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((new Date(deliveryDate).getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'border-red-200 bg-red-50/60';
  if (diff === 0) return 'border-orange-200 bg-orange-50/40';
  if (diff === 1) return 'border-amber-200 bg-amber-50/30';
  return 'border-gourmand-border bg-white';
}

function urgencyBadge(deliveryDate: string, status: CommandeStatus): { label: string; cls: string } | null {
  if (status === 'delivered') return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((new Date(deliveryDate).getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: 'En retard', cls: 'bg-red-100 text-red-600' };
  if (diff === 0) return { label: "Aujourd'hui", cls: 'bg-orange-100 text-orange-600' };
  if (diff === 1) return { label: 'Demain', cls: 'bg-amber-100 text-amber-600' };
  return null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function itemsSummary(items: CommandeItem[]): string {
  const parts = items.filter(i => i.dessertName).map(i => `${i.quantity}× ${i.dessertName}`);
  if (parts.length === 0) return '–';
  if (parts.length <= 2) return parts.join(', ');
  return `${parts.slice(0, 2).join(', ')} +${parts.length - 2}`;
}

function totalPieces(items: CommandeItem[]): number {
  return items.reduce((s, i) => s + i.quantity, 0);
}

/** Agrège les quantités par dessert pour les commandes non livrées (production). */
type ProductionRow = {
  key: string;
  dessertId: string | null;
  emoji: string;
  name: string;
  pendingQty: number;
  readyQty: number;
  totalQty: number;
};

function productionKey(item: CommandeItem): string | null {
  if (item.dessertId) return `id:${item.dessertId}`;
  const n = item.dessertName.trim();
  if (!n) return null;
  return `name:${n.toLowerCase()}`;
}

function aggregateProduction(commandes: Commande[]): ProductionRow[] {
  const map = new Map<string, { dessertId: string | null; emoji: string; name: string; pendingQty: number; readyQty: number }>();
  for (const cmd of commandes) {
    if (cmd.status === 'delivered') continue;
    for (const item of cmd.items) {
      const qty = Math.max(0, item.quantity);
      if (qty === 0) continue;
      const key = productionKey(item);
      if (!key) continue;
      let row = map.get(key);
      if (!row) {
        row = {
          dessertId: item.dessertId,
          emoji: item.dessertEmoji?.trim() || '🍰',
          name: item.dessertName.trim() || 'Dessert',
          pendingQty: 0,
          readyQty: 0,
        };
        map.set(key, row);
      }
      if (cmd.status === 'pending') row.pendingQty += qty;
      else if (cmd.status === 'ready') row.readyQty += qty;
    }
  }
  const rows: ProductionRow[] = [...map.entries()].map(([key, v]) => ({
    key,
    ...v,
    totalQty: v.pendingQty + v.readyQty,
  }));
  rows.sort((a, b) => b.totalQty - a.totalQty || a.name.localeCompare(b.name, 'fr'));
  return rows.filter(r => r.totalQty > 0);
}

const todayISO = new Date().toISOString().split('T')[0];

const BLANK_ITEM: CommandeItem = { dessertId: null, dessertName: '', dessertEmoji: '🍰', quantity: 1 };

const BLANK: Commande = {
  id: 'cmd-new',
  clientName: '',
  items: [{ ...BLANK_ITEM }],
  orderDate: todayISO,
  deliveryDate: todayISO,
  notes: '',
  customerType: 'particulier',
  status: 'pending',
  notifyBefore: [1],
  createdAt: '',
};

export const CommandesScreen: React.FC<Props> = ({ commandes, desserts, onSave, onDelete, onAddSale, showToast }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Commande>(BLANK);
  const [deleteTarget, setDeleteTarget] = useState<Commande | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<CommandeStatus | 'all'>('all');
  const [notifPerm, setNotifPerm] = useState<ReturnType<typeof getNotificationPermission>>(getNotificationPermission);
  const [deliverTarget, setDeliverTarget] = useState<Commande | null>(null);
  const [converting, setConverting] = useState(false);

  const filtered = useMemo(() => {
    const list = filter === 'all' ? commandes : commandes.filter(c => c.status === filter);
    return [...list].sort((a, b) => {
      if (a.status === 'delivered' && b.status !== 'delivered') return 1;
      if (b.status === 'delivered' && a.status !== 'delivered') return -1;
      return a.deliveryDate.localeCompare(b.deliveryDate);
    });
  }, [commandes, filter]);

  const pendingCount = useMemo(() => commandes.filter(c => c.status === 'pending').length, [commandes]);

  const productionRows = useMemo(() => aggregateProduction(commandes), [commandes]);
  const productionPending = useMemo(
    () => productionRows.reduce((s, r) => s + r.pendingQty, 0),
    [productionRows],
  );
  const productionReady = useMemo(
    () => productionRows.reduce((s, r) => s + r.readyQty, 0),
    [productionRows],
  );
  const productionTotal = productionPending + productionReady;
  const productionDonePct = productionTotal > 0 ? Math.round((productionReady / productionTotal) * 100) : 0;

  const openNew = () => {
    setEditing({ ...BLANK, id: 'cmd-new', items: [{ ...BLANK_ITEM }], orderDate: todayISO, deliveryDate: todayISO });
    setModalOpen(true);
  };

  const openEdit = (cmd: Commande) => {
    setEditing({ ...cmd, items: cmd.items.map(i => ({ ...i })) });
    setModalOpen(true);
  };

  // ─── Item helpers ───────────────────────────────────────────
  const setItem = (idx: number, patch: Partial<CommandeItem>) => {
    setEditing(prev => {
      const items = prev.items.map((it, i) => i === idx ? { ...it, ...patch } : it);
      return { ...prev, items };
    });
  };

  const handleDessertChange = (idx: number, dessertId: string) => {
    if (!dessertId) { setItem(idx, { dessertId: null, dessertName: '', dessertEmoji: '🍰' }); return; }
    const d = desserts.find(d => d.id === dessertId);
    if (d) setItem(idx, { dessertId: d.id, dessertName: d.name, dessertEmoji: d.emoji });
  };

  const addItem = () => setEditing(prev => ({ ...prev, items: [...prev.items, { ...BLANK_ITEM }] }));

  const removeItem = (idx: number) => {
    setEditing(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  // ─── Notify prefs ───────────────────────────────────────────
  const toggleNotify = (val: NotifyBefore) => {
    setEditing(prev => {
      const has = prev.notifyBefore.includes(val);
      return {
        ...prev,
        notifyBefore: has ? prev.notifyBefore.filter(v => v !== val) : [...prev.notifyBefore, val],
      };
    });
  };

  const handleRequestPerm = async () => {
    const granted = await requestNotificationPermission();
    setNotifPerm(getNotificationPermission());
    if (!granted) showToast('Notifications refusées. Autorise dans Réglages > Safari.', 'error');
  };

  // ─── Save ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!editing.clientName.trim()) { showToast('Nom du client requis', 'error'); return; }
    const validItems = editing.items.filter(i => i.dessertName.trim());
    if (validItems.length === 0) { showToast('Au moins un dessert requis', 'error'); return; }
    if (!editing.deliveryDate) { showToast('Date de livraison requise', 'error'); return; }
    setSaving(true);
    try {
      await onSave({ ...editing, items: validItems });
      showToast(editing.id === 'cmd-new' ? 'Commande créée ✓' : 'Commande mise à jour ✓');
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAdvanceStatus = async (cmd: Commande) => {
    const next = STATUS_NEXT[cmd.status];
    if (!next) return;
    if (next === 'delivered') {
      setDeliverTarget(cmd);
      return;
    }
    await onSave({ ...cmd, status: next });
    showToast(`${STATUS_LABEL[next]} ✓`);
  };

  const handleConfirmDeliver = async (recordSale: boolean) => {
    if (!deliverTarget) return;
    setConverting(true);
    try {
      if (recordSale) {
        let skipped = 0;
        for (const item of deliverTarget.items) {
          if (!item.dessertId) { skipped++; continue; }
          const dessert = desserts.find(d => d.id === item.dessertId);
          if (!dessert) { skipped++; continue; }
          await onAddSale(dessert, item.quantity, deliverTarget.customerType);
        }
        if (skipped > 0) showToast(`${skipped} article(s) ignoré(s) — dessert introuvable`, 'info');
      }
      await onSave({ ...deliverTarget, status: 'delivered' });
      showToast('Commande livrée ✓');
      setDeliverTarget(null);
    } finally {
      setConverting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await onDelete(deleteTarget.id);
    showToast('Commande supprimée', 'info');
    setDeleteTarget(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full overflow-y-auto scrollbar-hide px-2 pb-32"
    >
      <PageHeader
        brand="Gestion"
        title="Commandes"
        description={
          productionTotal > 0
            ? `${pendingCount} commande(s) en attente · ${commandes.length} au total · ${productionTotal} dessert(s) à produire`
            : `${pendingCount} en attente · ${commandes.length} total`
        }
        action={
          <IconActionButton
            size="compact"
            onClick={openNew}
            icon={<Plus size={18} strokeWidth={2.25} />}
            label="Ajouter une commande"
          />
        }
      />

      {/* Filtres */}
      <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {(['all', 'pending', 'ready', 'delivered'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-gourmand-chocolate text-white'
                : 'bg-gourmand-bg text-gourmand-biscuit border border-gourmand-border'
            }`}
          >
            {f === 'all' ? 'Toutes' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {/* Synthèse production (desserts à fabriquer vs prêtes) */}
      {productionRows.length > 0 && (
        <div className="px-4 pb-3">
          <SectionCard title="À produire" padding>
            <div className="rounded-xl bg-gourmand-bg border border-gourmand-border/80 p-3.5 mb-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gourmand-chocolate text-white">
                  <ChefHat size={22} strokeWidth={2} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gourmand-biscuit">
                    Total desserts (commandes non livrées)
                  </p>
                  <p className="mt-0.5 text-3xl font-bold tabular-nums text-gourmand-chocolate leading-none">
                    {productionTotal}
                  </p>
                  <p className="mt-2 text-xs font-medium text-gourmand-cocoa">
                    <span className="text-amber-700">{productionPending}</span>
                    {' à fabriquer'}
                    {productionReady > 0 && (
                      <>
                        {' · '}
                        <span className="text-emerald-700">{productionReady}</span>
                        {' prête(s)'}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div
                className="mt-3"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={productionDonePct}
                aria-label="Part des desserts déjà marqués prêts sur le total à produire"
              >
                <div className="h-2 w-full overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 ease-out"
                    style={{ width: `${productionDonePct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-gourmand-biscuit">
                  Quand une commande est « Prête », ses desserts comptent ici comme fabriqués. Il reste à livrer pour clôturer.
                </p>
              </div>
            </div>
            <ul className="space-y-2.5">
              {productionRows.map(row => (
                <li
                  key={row.key}
                  className="flex items-center gap-2.5 rounded-xl border border-gourmand-border/60 bg-white px-3 py-2.5"
                >
                  <span className="text-xl leading-none shrink-0" aria-hidden>{row.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gourmand-chocolate truncate">{row.name}</p>
                    <p className="text-[11px] text-gourmand-biscuit tabular-nums">
                      {row.pendingQty > 0 && (
                        <span className="text-amber-800 font-medium">{row.pendingQty} en fabrication</span>
                      )}
                      {row.pendingQty > 0 && row.readyQty > 0 && ' · '}
                      {row.readyQty > 0 && (
                        <span className="text-emerald-700 font-medium">{row.readyQty} prête(s)</span>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-gourmand-bg px-2 py-1 text-xs font-bold tabular-nums text-gourmand-chocolate">
                    {row.totalQty}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      )}

      {/* Banner permission notif */}
      {notifPerm === 'default' && isNotificationSupported() && (
        <div className="mx-4 mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3">
          <Bell size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-medium flex-1">Autorise les notifications pour les rappels de commandes</p>
          <button onClick={handleRequestPerm} className="text-xs font-bold text-amber-700 underline whitespace-nowrap">Activer</button>
        </div>
      )}
      {notifPerm === 'denied' && (
        <div className="mx-4 mb-3 p-3 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3">
          <BellOff size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600 font-medium">{'Notifications bloquées. Autorise dans Réglages > Safari > Notifications.'}</p>
        </div>
      )}

      {/* Liste */}
      <div className="px-4 space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gourmand-biscuit">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucune commande</p>
            <p className="text-xs opacity-60 mt-1">Appuie sur + pour en ajouter une</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {filtered.map(cmd => {
            const badge = urgencyBadge(cmd.deliveryDate, cmd.status);
            const nextStatus = STATUS_NEXT[cmd.status];
            const pieces = totalPieces(cmd.items);
            return (
              <motion.div
                key={cmd.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`gourmand-card border p-3 cursor-pointer ${urgencyClass(cmd.deliveryDate, cmd.status)}`}
                onClick={() => openEdit(cmd)}
              >
                <div className="flex items-start gap-3">
                  {/* Emojis empilés */}
                  <div className="flex flex-col items-center gap-0.5 flex-shrink-0 mt-0.5">
                    {cmd.items.slice(0, 2).map((it, i) => (
                      <span key={i} className="text-xl leading-none">{it.dessertEmoji}</span>
                    ))}
                    {cmd.items.length > 2 && (
                      <span className="text-[9px] font-bold text-gourmand-biscuit">+{cmd.items.length - 2}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm truncate">{cmd.clientName}</span>
                  <span className={`gourmand-chip ${
                    cmd.customerType === 'pro'
                      ? 'bg-gourmand-chocolate text-white'
                      : 'bg-gourmand-bg text-gourmand-biscuit border border-gourmand-border'
                  }`}>
                    {cmd.customerType === 'pro' ? 'Pro' : 'Particulier'}
                  </span>
                      {badge && (
                        <span className={`gourmand-chip ${badge.cls}`}>{badge.label}</span>
                      )}
                      <span className={`gourmand-chip ml-auto ${
                        cmd.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        cmd.status === 'ready' ? 'bg-blue-100 text-blue-700' :
                        'bg-emerald-100 text-emerald-600'
                      }`}>
                        {STATUS_LABEL[cmd.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gourmand-biscuit mt-0.5 truncate">
                      {itemsSummary(cmd.items)}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-gourmand-biscuit">
                        <Clock size={10} />
                        {formatDate(cmd.deliveryDate)}
                      </span>
                      <span className="text-xs text-gourmand-biscuit">
                        {pieces} pièce{pieces > 1 ? 's' : ''}
                      </span>
                      {cmd.notifyBefore.length > 0 && (
                        <Bell size={10} className="text-gourmand-biscuit/60" />
                      )}
                    </div>
                    {cmd.notes ? (
                      <p className="text-xs text-gourmand-biscuit/70 mt-1 italic truncate">{cmd.notes}</p>
                    ) : null}
                  </div>
                  <ChevronRight size={16} className="text-gourmand-biscuit/40 flex-shrink-0 mt-1" />
                </div>

                {nextStatus && (
                  <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-gourmand-border/50 items-center">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleAdvanceStatus(cmd); }}
                      className="gourmand-btn-primary-compact"
                    >
                      <Check size={14} strokeWidth={2.5} />
                      {STATUS_NEXT_LABEL[cmd.status]}
                    </button>
                    <button
                      type="button"
                      aria-label="Supprimer la commande"
                      onClick={e => { e.stopPropagation(); setDeleteTarget(cmd); }}
                      className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-400 hover:bg-red-50"
                    >
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  </div>
                )}
                {!nextStatus && (
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      aria-label="Supprimer la commande"
                      onClick={e => { e.stopPropagation(); setDeleteTarget(cmd); }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-300 hover:bg-red-50"
                    >
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Modal création/édition */}
      <AnimatePresence>
        {modalOpen && (
          <Modal
            title={editing.id === 'cmd-new' ? 'Nouvelle commande' : 'Modifier la commande'}
            onClose={() => setModalOpen(false)}
          >
            <div className="p-5 space-y-6">

              {/* Client */}
              <div>
                <FormLabel>Nom du client</FormLabel>
                <input
                  className="gourmand-input w-full"
                  placeholder="Ex : Marie Dupont"
                  value={editing.clientName}
                  onChange={e => setEditing(prev => ({ ...prev, clientName: e.target.value }))}
                />
              </div>

              {/* Desserts */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gourmand-biscuit">
                    Desserts commandés
                  </span>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-gourmand-chocolate active:bg-gourmand-bg"
                  >
                    <Plus size={14} strokeWidth={2.25} /> Ajouter
                  </button>
                </div>
                <div className="space-y-2.5">
                  {editing.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-lg">{item.dessertEmoji}</span>
                      <select
                        className="gourmand-input flex-1 text-sm"
                        value={item.dessertId || ''}
                        onChange={e => handleDessertChange(idx, e.target.value)}
                      >
                        <option value="">— Dessert —</option>
                        {desserts.map(d => (
                          <option key={d.id} value={d.id}>{d.emoji} {d.name}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        className="gourmand-input w-16 text-center"
                        value={item.quantity}
                        onChange={e => setItem(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                      />
                      {editing.items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="text-red-400 flex-shrink-0">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FormLabel>Commande le</FormLabel>
                  <input
                    type="date"
                    className="gourmand-input w-full"
                    value={editing.orderDate}
                    onChange={e => setEditing(prev => ({ ...prev, orderDate: e.target.value }))}
                  />
                </div>
                <div>
                  <FormLabel>Livraison le</FormLabel>
                  <input
                    type="date"
                    className="gourmand-input w-full"
                    value={editing.deliveryDate}
                    onChange={e => setEditing(prev => ({ ...prev, deliveryDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <FormLabel>Type client</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(prev => ({ ...prev, customerType: 'particulier' }))}
                    className={`gourmand-segment-compact ${
                      editing.customerType === 'particulier'
                        ? 'gourmand-segment-active'
                        : 'gourmand-segment-idle'
                    }`}
                  >
                    Particulier
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(prev => ({ ...prev, customerType: 'pro' }))}
                    className={`gourmand-segment-compact ${
                      editing.customerType === 'pro'
                        ? 'gourmand-segment-active'
                        : 'gourmand-segment-idle'
                    }`}
                  >
                    Pro
                  </button>
                </div>
              </div>

              {/* Notifications */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Bell size={14} className="text-gourmand-biscuit shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gourmand-biscuit">Rappels</span>
                  {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
                    <button
                      type="button"
                      onClick={handleRequestPerm}
                      className="ml-auto text-[11px] font-semibold text-gourmand-chocolate underline"
                    >
                      {notifPerm === 'denied' ? 'Bloqué' : 'Activer'}
                    </button>
                  )}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {NOTIFY_OPTIONS.map(opt => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => toggleNotify(opt.value)}
                      disabled={notifPerm === 'denied' || notifPerm === 'unsupported'}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all disabled:opacity-40 ${
                        editing.notifyBefore.includes(opt.value)
                          ? 'bg-gourmand-chocolate text-white border-gourmand-chocolate'
                          : 'bg-white text-gourmand-biscuit border-gourmand-border'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {notifPerm === 'unsupported' && (
                  <p className="text-xs text-gourmand-biscuit/60 mt-2">Notifications non supportées sur cet appareil.</p>
                )}
                {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
                  <p className="text-xs text-gourmand-biscuit/60 mt-2">Active les notifications pour recevoir des rappels à 8h.</p>
                )}
              </div>

              {/* Statut (edit only) */}
              {editing.id !== 'cmd-new' && (
                <div>
                  <FormLabel>Statut</FormLabel>
                  <select
                    className="gourmand-input w-full"
                    value={editing.status}
                    onChange={e => setEditing(prev => ({ ...prev, status: e.target.value as CommandeStatus }))}
                  >
                    <option value="pending">En attente</option>
                    <option value="ready">Prête</option>
                    <option value="delivered">Livrée</option>
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <FormLabel>Notes</FormLabel>
                <textarea
                  className="gourmand-input w-full resize-none min-h-[88px]"
                  rows={3}
                  placeholder="Allergies, adresse, personnalisation…"
                  value={editing.notes}
                  onChange={e => setEditing(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="gourmand-btn-primary-compact w-full"
              >
                {saving ? 'Enregistrement…' : editing.id === 'cmd-new' ? 'Créer la commande' : 'Enregistrer'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDialog
            title="Supprimer cette commande ?"
            message={`La commande de ${deleteTarget.clientName} sera définitivement supprimée.`}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Modale livraison → vente */}
      <AnimatePresence>
        {deliverTarget && (
          <Modal
            title="Marquer comme livrée ?"
            onClose={() => !converting && setDeliverTarget(null)}
          >
            <div className="p-5 space-y-5">
              <p className="text-sm text-gourmand-cocoa/75 font-medium leading-relaxed">
                Enregistrer cette commande comme vente dans le Dashboard ?
              </p>
              <div className="bg-gourmand-bg rounded-xl p-3 space-y-1.5">
                {deliverTarget.items.map((item, i) => (
                  <p key={i} className="text-sm font-medium">
                    {item.dessertEmoji} {item.quantity}× {item.dessertName || '–'}
                  </p>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleConfirmDeliver(true)}
                disabled={converting}
                className="gourmand-btn-primary-compact w-full"
              >
                {converting ? 'Enregistrement…' : 'Enregistrer + Livrer'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeliver(false)}
                disabled={converting}
                className="w-full rounded-lg border border-gourmand-border bg-white py-2.5 text-xs font-semibold text-gourmand-cocoa active:bg-gourmand-bg disabled:opacity-40 transition-colors"
              >
                Livrer uniquement (sans vente)
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
