import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Check,
  Package,
  Clock,
  ChevronRight,
  Bell,
  BellOff,
  X,
  ChefHat,
  ClipboardList,
} from 'lucide-react';
import { Commande, CommandeItem, CommandeStatus, NotifyBefore, Dessert } from '../types';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { IconActionButton } from '../components/IconActionButton';
import { FormLabel } from '../components/FormLabel';
import {
  requestNotificationPermission,
  getNotificationPermission,
  isNotificationSupported,
} from '../lib/notifications';
import {
  clampProducedQty,
  commandeProductionComplete,
  dessertLabelForKey,
  kitchenLinesByDessert,
  mergeCommandeItems,
  normalizeCommandeItem,
  normalizeCommandeItems,
  totalDessertsOrdered,
  totalDessertsRemaining,
} from '../lib/commandeProduction';

interface Props {
  commandes: Commande[];
  desserts: Dessert[];
  onSave: (cmd: Commande) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddSale: (dessert: Dessert, quantity: number, customerType: 'particulier' | 'pro') => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type ScreenTab = 'commandes' | 'cuisine';

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
  pending: 'Marquer prête',
  ready: 'Marquer livrée',
  delivered: '',
};

const NOTIFY_OPTIONS: { value: NotifyBefore; label: string }[] = [
  { value: 2, label: '2 jours avant' },
  { value: 1, label: '1 jour avant' },
  { value: 0, label: 'Jour même (8h)' },
];

function urgencyClass(deliveryDate: string, status: CommandeStatus): string {
  if (status === 'delivered') return 'border-stone-200 bg-stone-50/80 opacity-70';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((new Date(deliveryDate).getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'border-red-200 bg-red-50/60';
  if (diff === 0) return 'border-orange-200 bg-orange-50/40';
  if (diff === 1) return 'border-amber-200 bg-amber-50/30';
  return 'border-gourmand-border bg-white';
}

function urgencyBadge(deliveryDate: string, status: CommandeStatus): { label: string; cls: string } | null {
  if (status === 'delivered') return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
  const merged = mergeCommandeItems(items);
  const parts = merged.map(i => `${i.dessertEmoji ? `${i.dessertEmoji} ` : ''}${i.quantity}× ${i.dessertName}`);
  if (parts.length === 0) return '–';
  if (parts.length <= 2) return parts.join(', ');
  return `${parts.slice(0, 2).join(', ')} +${parts.length - 2}`;
}

function totalPieces(items: CommandeItem[]): number {
  return items.reduce((s, i) => s + i.quantity, 0);
}

function producedPieces(items: CommandeItem[]): number {
  return items.reduce((s, i) => s + clampProducedQty(i), 0);
}

/** Tap sur le cercle d’index i : réduit si déjà au-delà, sinon remplit jusqu’à i+1. */
function nextProducedTap(i: number, produced: number, quantity: number): number {
  const q = Math.max(0, quantity);
  let p = Math.min(q, Math.max(0, produced));
  if (p > i) return i;
  return Math.min(q, i + 1);
}

const todayISO = new Date().toISOString().split('T')[0];

const BLANK_ITEM: CommandeItem = { dessertId: null, dessertName: '', dessertEmoji: '🍰', quantity: 1, producedQty: 0 };

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

const NOTES_CHECKLIST_MAX_ROWS = 20;

/** Checklist type Rappels : une ligne par unité, rond à gauche, infos à droite. */
function NotesChecklistUnits({
  quantity,
  produced,
  onChange,
  disabled,
  emoji,
  dessertName,
  clientLine,
}: {
  quantity: number;
  produced: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  emoji: string;
  dessertName: string;
  clientLine: string;
}) {
  const q = Math.max(0, Math.floor(quantity));
  const p = Math.min(q, Math.max(0, Math.floor(produced)));
  if (q === 0) return null;

  if (q > NOTES_CHECKLIST_MAX_ROWS) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gourmand-border bg-white px-2 py-1.5" role="group">
        <button
          type="button"
          disabled={disabled || p <= 0}
          onClick={() => onChange(Math.max(0, p - 1))}
          className="min-h-11 min-w-11 rounded-lg text-lg font-medium text-gourmand-chocolate hover:bg-gourmand-bg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Moins une unité prête"
        >
          −
        </button>
        <span className="flex-1 text-center text-sm font-semibold tabular-nums text-gourmand-chocolate">{p}/{q}</span>
        <button
          type="button"
          disabled={disabled || p >= q}
          onClick={() => onChange(Math.min(q, p + 1))}
          className="min-h-11 min-w-11 rounded-lg text-lg font-medium text-gourmand-chocolate hover:bg-gourmand-bg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Plus une unité prête"
        >
          +
        </button>
      </div>
    );
  }

  return (
    <ul
      className="overflow-hidden rounded-xl border border-gourmand-border/80 bg-white divide-y divide-gourmand-border/50"
      role="list"
      aria-label={`${p} sur ${q} prêts`}
    >
      {Array.from({ length: q }, (_, i) => {
        const filled = i < p;
        return (
          <li key={i} className="flex items-center gap-3 min-h-[48px] pl-3 pr-2">
            <button
              type="button"
              disabled={disabled}
              aria-pressed={filled}
              aria-label={filled ? `Décocher après l’unité ${i + 1}` : `Cocher jusqu’à l’unité ${i + 1}`}
              onClick={() => onChange(nextProducedTap(i, p, q))}
              className={`shrink-0 flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gourmand-chocolate ${
                filled ? 'border-emerald-600 bg-emerald-500 text-white' : 'border-stone-300 bg-white'
              }`}
            >
              {filled ? <Check size={12} strokeWidth={3} aria-hidden /> : null}
            </button>
            <div className="min-w-0 flex-1 py-2">
              {i === 0 ? (
                <>
                  <p className="text-[15px] font-medium leading-snug text-gourmand-chocolate">
                    <span className="mr-1.5" aria-hidden>
                      {emoji}
                    </span>
                    {dessertName}
                    <span className="text-gourmand-biscuit font-normal tabular-nums"> · ×{q}</span>
                  </p>
                  {clientLine ? <p className="text-xs text-gourmand-biscuit truncate mt-0.5">{clientLine}</p> : null}
                </>
              ) : (
                <p className="text-[13px] text-gourmand-biscuit/50 tabular-nums">{i + 1}/{q}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export const CommandesScreen: React.FC<Props> = ({ commandes, desserts, onSave, onDelete, onAddSale, showToast }) => {
  const [screenTab, setScreenTab] = useState<ScreenTab>('commandes');
  const [formOpen, setFormOpen] = useState(false);
  const [detailCommand, setDetailCommand] = useState<Commande | null>(null);
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
  const remainingKitchen = useMemo(() => totalDessertsRemaining(commandes), [commandes]);
  const orderedKitchen = useMemo(() => totalDessertsOrdered(commandes), [commandes]);
  const kitchenPct = orderedKitchen > 0 ? Math.round(((orderedKitchen - remainingKitchen) / orderedKitchen) * 100) : 0;

  const kitchenGroups = useMemo(() => {
    const map = kitchenLinesByDessert(commandes);
    return [...map.entries()]
      .map(([key, lines]) => ({ key, lines, ...dessertLabelForKey(key, lines) }))
      .sort((a, b) => {
        const remA = a.lines.reduce((s, l) => s + (l.item.quantity - clampProducedQty(l.item)), 0);
        const remB = b.lines.reduce((s, l) => s + (l.item.quantity - clampProducedQty(l.item)), 0);
        if (remB !== remA) return remB - remA;
        return a.name.localeCompare(b.name, 'fr');
      });
  }, [commandes]);


  const openDetail = (cmd: Commande) => {
    const normalized = normalizeCommandeItems(cmd.items.map(i => ({ ...i })));
    setDetailCommand({ ...cmd, items: normalized });
    setEditing({ ...cmd, items: normalized.length ? normalized.map(i => ({ ...i })) : [{ ...BLANK_ITEM }] });
  };

  const openNewCommandForm = () => {
    setEditing({ ...BLANK, id: 'cmd-new', items: [{ ...BLANK_ITEM }], orderDate: todayISO, deliveryDate: todayISO });
    setFormOpen(true);
  };

  useEffect(() => {
    const id = detailCommand?.id;
    if (!id) return;
    const fresh = commandes.find(c => c.id === id);
    if (!fresh) return;
    const normalized = normalizeCommandeItems(fresh.items.map(i => ({ ...i })));
    setDetailCommand(prev => (prev && prev.id === id ? { ...fresh, items: normalized } : prev));
  }, [commandes, detailCommand?.id]);

  const setItem = (idx: number, patch: Partial<CommandeItem>) => {
    setEditing(prev => {
      const items = prev.items.map((it, i) => (i === idx ? normalizeCommandeItem({ ...it, ...patch }) : it));
      return { ...prev, items };
    });
  };

  const handleDessertChange = (idx: number, dessertId: string) => {
    if (!dessertId) {
      setItem(idx, { dessertId: null, dessertName: '', dessertEmoji: '🍰', producedQty: 0 });
      return;
    }
    const d = desserts.find(x => x.id === dessertId);
    if (d) setItem(idx, { dessertId: d.id, dessertName: d.name, dessertEmoji: d.emoji, producedQty: 0 });
  };

  const MAX_DESSERT_LINES = 24;

  const addItem = () => {
    setEditing(prev => {
      if (prev.items.length >= MAX_DESSERT_LINES) {
        void Promise.resolve().then(() => showToast(`Maximum ${MAX_DESSERT_LINES} lignes de desserts.`, 'error'));
        return prev;
      }
      return { ...prev, items: [...prev.items, { ...BLANK_ITEM }] };
    });
  };

  const removeItem = (idx: number) => {
    setEditing(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

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

  const persistCommande = useCallback(
    async (cmd: Commande, toastMsg?: string) => {
      const normalized = { ...cmd, items: normalizeCommandeItems(cmd.items) };
      await onSave(normalized);
      if (toastMsg) showToast(toastMsg, 'success');
    },
    [onSave, showToast],
  );

  const persistWithMergedItems = useCallback(
    async (cmd: Commande, toastMsg?: string) => {
      const merged = mergeCommandeItems(cmd.items);
      await persistCommande({ ...cmd, items: merged }, toastMsg);
    },
    [persistCommande],
  );

  const patchCommandeItem = useCallback(
    async (cmd: Commande, itemIndex: number, patch: Partial<CommandeItem>) => {
      const items = cmd.items.map((it, i) => (i === itemIndex ? normalizeCommandeItem({ ...it, ...patch }) : it));
      await persistCommande({ ...cmd, items });
    },
    [persistCommande],
  );

  const handleSave = async () => {
    if (!editing.clientName.trim()) {
      showToast('Nom du client requis', 'error');
      return;
    }
    const validItems = editing.items.filter(i => i.dessertName.trim());
    if (validItems.length === 0) {
      showToast('Au moins un dessert requis', 'error');
      return;
    }
    if (!editing.deliveryDate) {
      showToast('Date de livraison requise', 'error');
      return;
    }
    setSaving(true);
    try {
      await persistWithMergedItems(
        { ...editing, items: validItems, status: 'pending' },
        'Commande créée ✓',
      );
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDetailCommand = async () => {
    if (!detailCommand) return;
    if (!editing.clientName.trim()) {
      showToast('Nom du client requis', 'error');
      return;
    }
    const validItems = editing.items.filter(i => i.dessertName.trim());
    if (validItems.length === 0) {
      showToast('Au moins un dessert requis', 'error');
      return;
    }
    if (!editing.deliveryDate) {
      showToast('Date de livraison requise', 'error');
      return;
    }
    let nextStatus = editing.status;
    const mergedItems = mergeCommandeItems(validItems);
    if (nextStatus === 'ready' && !commandeProductionComplete({ ...detailCommand, items: mergedItems })) {
      showToast('Cuisine : tout cocher avant « Prête ».', 'error');
      nextStatus = 'pending';
    }
    setSaving(true);
    try {
      const saved = {
        ...detailCommand,
        clientName: editing.clientName.trim(),
        orderDate: editing.orderDate,
        deliveryDate: editing.deliveryDate,
        notes: editing.notes,
        customerType: editing.customerType,
        notifyBefore: editing.notifyBefore,
        status: nextStatus,
        items: mergedItems,
      };
      await persistCommande(saved, 'Enregistré ✓');
      setDetailCommand({ ...saved, items: mergedItems.map(i => ({ ...i })) });
      setEditing({ ...saved, items: mergedItems.map(i => ({ ...i })) });
    } finally {
      setSaving(false);
    }
  };

  const handleAdvanceStatus = async (cmd: Commande) => {
    const live = commandes.find(c => c.id === cmd.id) ?? cmd;
    const next = STATUS_NEXT[live.status];
    if (!next) return;
    if (next === 'ready') {
      if (!commandeProductionComplete(live)) {
        showToast('Cuisine : tout cocher d’abord.', 'error');
        setScreenTab('cuisine');
        return;
      }
      await persistCommande({ ...live, status: next }, `${STATUS_LABEL[next]} ✓`);
      setDetailCommand(prev => (prev && prev.id === live.id ? { ...prev, status: 'ready' } : prev));
      setEditing(prev => (prev.id === live.id ? { ...prev, status: 'ready' } : prev));
      return;
    }
    if (next === 'delivered') {
      setDeliverTarget(live);
    }
  };

  const handleConfirmDeliver = async (recordSale: boolean) => {
    if (!deliverTarget) return;
    setConverting(true);
    try {
      if (recordSale) {
        let skipped = 0;
        for (const item of deliverTarget.items) {
          if (!item.dessertId) {
            skipped++;
            continue;
          }
          const dessert = desserts.find(d => d.id === item.dessertId);
          if (!dessert) {
            skipped++;
            continue;
          }
          await onAddSale(dessert, item.quantity, deliverTarget.customerType);
        }
        if (skipped > 0) showToast(`${skipped} article(s) ignoré(s) — dessert introuvable`, 'info');
      }
      await persistCommande({ ...deliverTarget, status: 'delivered' }, 'Commande livrée ✓');
      setDeliverTarget(null);
      setDetailCommand(null);
    } finally {
      setConverting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await onDelete(deleteTarget.id);
    showToast('Commande supprimée', 'info');
    setDeleteTarget(null);
    setDetailCommand(null);
  };

  const detailNext = detailCommand ? STATUS_NEXT[detailCommand.status] : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col min-h-0 overflow-hidden"
    >
      <div className="shrink-0">
        <PageHeader
          brand="Gestion"
          title="Ordres"
          description={
            orderedKitchen > 0
              ? `${pendingCount} attente · ${commandes.length} total · ${remainingKitchen} restant cuisine`
              : `${pendingCount} attente · ${commandes.length} total`
          }
          action={
            <IconActionButton
              size="compact"
              onClick={openNewCommandForm}
              icon={<Plus size={18} strokeWidth={2.25} />}
              label="Ajouter une commande"
            />
          }
        />

        <div className="px-4 pb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setScreenTab('commandes')}
            className={`flex flex-1 min-w-0 items-center justify-center gap-2 rounded-xl py-3 px-2 text-sm font-semibold transition-colors duration-200 cursor-pointer border ${
              screenTab === 'commandes'
                ? 'bg-gourmand-chocolate text-white border-gourmand-chocolate'
                : 'bg-white text-gourmand-cocoa border-gourmand-border'
            }`}
          >
            <ClipboardList size={18} className="shrink-0" aria-hidden />
            <span className="truncate">Commandes</span>
          </button>
          <button
            type="button"
            onClick={() => setScreenTab('cuisine')}
            className={`flex flex-1 min-w-0 items-center justify-center gap-2 rounded-xl py-3 pl-2 pr-3 text-sm font-semibold transition-colors duration-200 cursor-pointer border ${
              screenTab === 'cuisine'
                ? 'bg-gourmand-chocolate text-white border-gourmand-chocolate'
                : 'bg-white text-gourmand-cocoa border-gourmand-border'
            }`}
          >
            <ChefHat size={18} className="shrink-0" aria-hidden />
            <span className="truncate">Cuisine</span>
            {remainingKitchen > 0 && (
              <span
                className={`ml-0.5 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
                  screenTab === 'cuisine' ? 'bg-white/20 text-white' : 'bg-amber-500 text-white'
                }`}
              >
                {remainingKitchen > 99 ? '99+' : remainingKitchen}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-2 pb-32">
        {screenTab === 'commandes' && (
          <>
            <div className="px-2 pb-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
              {(['all', 'pending', 'ready', 'delivered'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors duration-200 cursor-pointer shrink-0 ${
                    filter === f
                      ? 'bg-gourmand-chocolate text-white'
                      : 'bg-gourmand-bg text-gourmand-biscuit border border-gourmand-border'
                  }`}
                >
                  {f === 'all' ? 'Toutes' : STATUS_LABEL[f]}
                </button>
              ))}
            </div>

            {notifPerm === 'default' && isNotificationSupported() && (
              <div className="mx-2 mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <Bell size={16} className="text-amber-600 shrink-0" aria-hidden />
                <p className="text-xs text-amber-800 font-medium flex-1 min-w-0">Rappels commandes</p>
                <button
                  type="button"
                  onClick={handleRequestPerm}
                  className="text-xs font-bold text-amber-800 underline whitespace-nowrap cursor-pointer shrink-0"
                >
                  Activer
                </button>
              </div>
            )}
            {notifPerm === 'denied' && (
              <div className="mx-2 mb-3 p-3 rounded-2xl bg-red-50 border border-red-200">
                <div className="flex gap-2 items-start">
                  <BellOff size={16} className="text-red-500 shrink-0 mt-0.5" aria-hidden />
                  <p className="text-xs text-red-700 font-medium">Notifications bloquées (Réglages → Safari).</p>
                </div>
              </div>
            )}

            <div className="px-2 space-y-3">
              {filtered.length === 0 && (
                <div className="text-center py-16 text-gourmand-biscuit">
                  <Package size={40} className="mx-auto mb-3 opacity-30" aria-hidden />
                  <p className="text-sm font-medium">Aucune commande</p>
                  <p className="text-xs opacity-60 mt-1">+ pour ajouter</p>
                </div>
              )}

              <AnimatePresence initial={false}>
                {filtered.map(cmd => {
                  const badge = urgencyBadge(cmd.deliveryDate, cmd.status);
                  const pieces = totalPieces(cmd.items);
                  const prod = producedPieces(cmd.items);
                  const complete = commandeProductionComplete(cmd);
                  return (
                    <motion.button
                      type="button"
                      key={cmd.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`w-full text-left gourmand-card border p-3 cursor-pointer transition-opacity ${urgencyClass(cmd.deliveryDate, cmd.status)}`}
                      onClick={() => openDetail(cmd)}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="flex flex-col items-center gap-0.5 shrink-0 w-9 pt-0.5" aria-hidden>
                          {cmd.items.slice(0, 2).map((it, i) => (
                            <span key={i} className="text-xl leading-none">
                              {it.dessertEmoji || '🍰'}
                            </span>
                          ))}
                          {cmd.items.length > 2 && (
                            <span className="text-[9px] font-bold text-gourmand-biscuit">+{cmd.items.length - 2}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-bold text-sm truncate max-w-full">{cmd.clientName}</span>
                            <span
                              className={`gourmand-chip shrink-0 ${
                                cmd.customerType === 'pro'
                                  ? 'bg-gourmand-chocolate text-white'
                                  : 'bg-gourmand-bg text-gourmand-biscuit border border-gourmand-border'
                              }`}
                            >
                              {cmd.customerType === 'pro' ? 'Pro' : 'Particulier'}
                            </span>
                            {badge && <span className={`gourmand-chip shrink-0 ${badge.cls}`}>{badge.label}</span>}
                            <span
                              className={`gourmand-chip shrink-0 ${
                                cmd.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : cmd.status === 'ready'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {STATUS_LABEL[cmd.status]}
                            </span>
                          </div>
                          <p className="text-xs text-gourmand-biscuit mt-0.5 truncate">{itemsSummary(cmd.items)}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gourmand-biscuit">
                            <span className="inline-flex items-center gap-1 shrink-0">
                              <Clock size={10} aria-hidden />
                              {formatDate(cmd.deliveryDate)}
                            </span>
                            <span className="tabular-nums shrink-0">
                              {pieces} pièce{pieces > 1 ? 's' : ''}
                              {cmd.status === 'pending' && (
                                <span className="text-gourmand-cocoa/80">
                                  {' '}
                                  · cuisine {prod}/{pieces}
                                  {complete ? ' ✓' : ''}
                                </span>
                              )}
                            </span>
                            {cmd.notifyBefore.length > 0 && <Bell size={10} className="text-gourmand-biscuit/60 shrink-0" aria-hidden />}
                          </div>
                          {cmd.notes ? (
                            <p className="text-xs text-gourmand-biscuit/70 mt-1 italic line-clamp-2">{cmd.notes}</p>
                          ) : null}
                        </div>
                        <ChevronRight size={16} className="text-gourmand-biscuit/40 shrink-0 mt-1" aria-hidden />
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}

        {screenTab === 'cuisine' && (
          <div className="px-3 space-y-3 pb-4">
            <div className="gourmand-card border px-4 py-3 rounded-2xl flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gourmand-chocolate text-white">
                <ChefHat size={20} strokeWidth={2} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold tabular-nums text-gourmand-chocolate leading-tight">
                  {Math.max(0, orderedKitchen - remainingKitchen)}
                  <span className="text-gourmand-biscuit text-sm font-semibold"> / {orderedKitchen}</span>
                </p>
                {orderedKitchen > 0 && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gourmand-bg" role="progressbar" aria-valuenow={kitchenPct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-200" style={{ width: `${kitchenPct}%` }} />
                  </div>
                )}
              </div>
            </div>

            {kitchenGroups.length === 0 && (
              <div className="text-center py-12 text-gourmand-biscuit">
                <ChefHat size={36} className="mx-auto mb-2 opacity-25" aria-hidden />
                <p className="text-sm font-medium text-gourmand-cocoa">Rien en attente</p>
              </div>
            )}

            <div className="space-y-3">
              {kitchenGroups.map(({ key, lines, name, emoji }) => {
                const remaining = lines.reduce((s, l) => s + (l.item.quantity - clampProducedQty(l.item)), 0);
                const total = lines.reduce((s, l) => s + l.item.quantity, 0);
                const done = total - remaining;
                return (
                  <div key={key} className="gourmand-card border p-3 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 min-w-0 pb-2 border-b border-gourmand-border/60">
                      <span className="text-xl shrink-0" aria-hidden>
                        {emoji}
                      </span>
                      <h3 className="text-[15px] font-bold text-gourmand-chocolate truncate flex-1">{name}</h3>
                      <span className="text-xs font-semibold tabular-nums text-gourmand-biscuit shrink-0">
                        {done}/{total}
                      </span>
                    </div>
                    <ul className="space-y-4">
                      {lines.map(line => {
                        const cmd = commandes.find(c => c.id === line.commandeId);
                        if (!cmd) return null;
                        const p = clampProducedQty(line.item);
                        const q = line.item.quantity;
                        const clientLine = `${line.clientName} · ${formatDate(line.deliveryDate)}`;
                        return (
                          <li key={`${line.commandeId}-${line.itemIndex}`}>
                            <NotesChecklistUnits
                              quantity={q}
                              produced={p}
                              emoji={line.item.dessertEmoji || emoji}
                              dessertName={name}
                              clientLine={clientLine}
                              onChange={async n => {
                                await patchCommandeItem(cmd, line.itemIndex, { producedQty: n });
                              }}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Formulaire création / édition */}
      <AnimatePresence>
        {formOpen && (
          <Modal title="Nouvelle commande" onClose={() => setFormOpen(false)}>
            <div className="p-5 space-y-4 max-h-[min(85vh,32rem)] overflow-y-auto scrollbar-hide">
              <div>
                <FormLabel>Nom du client</FormLabel>
                <input
                  className="gourmand-input w-full min-w-0 text-base"
                  placeholder="Ex : Marie Dupont"
                  value={editing.clientName}
                  onChange={e => setEditing(prev => ({ ...prev, clientName: e.target.value }))}
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gourmand-biscuit">Desserts</span>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gourmand-chocolate border border-gourmand-border bg-white active:bg-gourmand-bg cursor-pointer min-h-11"
                  >
                    <Plus size={16} strokeWidth={2.25} /> Ligne
                  </button>
                </div>
                <div className="space-y-3">
                  {editing.items.map((item, idx) => (
                    <div key={idx} className="flex flex-wrap items-stretch gap-2 min-w-0 rounded-xl border border-gourmand-border bg-gourmand-bg/30 p-2">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center text-2xl leading-none" aria-hidden>
                        {item.dessertEmoji || '🍰'}
                      </span>
                      <select
                        className="gourmand-input flex-1 min-w-0 text-base py-2"
                        value={item.dessertId || ''}
                        onChange={e => handleDessertChange(idx, e.target.value)}
                      >
                        <option value="">—</option>
                        {desserts.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.emoji} {d.name}
                          </option>
                        ))}
                      </select>
                      <label className="sr-only" htmlFor={`new-qty-${idx}`}>
                        Quantité
                      </label>
                      <input
                        id={`new-qty-${idx}`}
                        type="number"
                        min={1}
                        max={999}
                        className="gourmand-input w-[4.5rem] shrink-0 text-center text-base py-2"
                        value={item.quantity}
                        onChange={e => setItem(idx, { quantity: Math.max(1, Math.min(999, Number(e.target.value) || 1)) })}
                      />
                      {editing.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50 cursor-pointer"
                          aria-label="Retirer cette ligne"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="min-w-0">
                  <FormLabel>Commande le</FormLabel>
                  <input
                    type="date"
                    className="gourmand-input w-full text-base"
                    value={editing.orderDate}
                    onChange={e => setEditing(prev => ({ ...prev, orderDate: e.target.value }))}
                  />
                </div>
                <div className="min-w-0">
                  <FormLabel>Livraison le</FormLabel>
                  <input
                    type="date"
                    className="gourmand-input w-full text-base"
                    value={editing.deliveryDate}
                    onChange={e => setEditing(prev => ({ ...prev, deliveryDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <FormLabel>Type client</FormLabel>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setEditing(prev => ({ ...prev, customerType: 'particulier' }))}
                    className={`gourmand-segment-compact min-h-11 cursor-pointer ${
                      editing.customerType === 'particulier' ? 'gourmand-segment-active' : 'gourmand-segment-idle'
                    }`}
                  >
                    Particulier
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(prev => ({ ...prev, customerType: 'pro' }))}
                    className={`gourmand-segment-compact min-h-11 cursor-pointer ${
                      editing.customerType === 'pro' ? 'gourmand-segment-active' : 'gourmand-segment-idle'
                    }`}
                  >
                    Pro
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Bell size={16} className="text-gourmand-biscuit shrink-0" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gourmand-biscuit">Rappels</span>
                  {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
                    <button
                      type="button"
                      onClick={handleRequestPerm}
                      className="ml-auto text-xs font-semibold text-gourmand-chocolate underline cursor-pointer"
                    >
                      {notifPerm === 'denied' ? 'Bloqué' : 'Activer'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {NOTIFY_OPTIONS.map(opt => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => toggleNotify(opt.value)}
                      disabled={notifPerm === 'denied' || notifPerm === 'unsupported'}
                      className={`min-h-11 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        editing.notifyBefore.includes(opt.value)
                          ? 'bg-gourmand-chocolate text-white border-gourmand-chocolate'
                          : 'bg-white text-gourmand-biscuit border-gourmand-border'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <FormLabel>Notes</FormLabel>
                <textarea
                  className="gourmand-input w-full resize-none min-h-[100px] text-base"
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
                className="gourmand-btn-primary w-full cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? 'Enregistrement…' : 'Créer la commande'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Détail commande — une seule vue scrollable */}
      <AnimatePresence>
        {detailCommand && (
          <Modal title={editing.clientName || 'Commande'} onClose={() => setDetailCommand(null)}>
            <div className="p-4 max-h-[min(88vh,42rem)] overflow-y-auto scrollbar-hide space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`gourmand-chip ${
                    editing.customerType === 'pro'
                      ? 'bg-gourmand-chocolate text-white'
                      : 'bg-gourmand-bg text-gourmand-biscuit border border-gourmand-border'
                  }`}
                >
                  {editing.customerType === 'pro' ? 'Pro' : 'Part.'}
                </span>
                <span
                  className={`gourmand-chip ${
                    editing.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : editing.status === 'ready'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {STATUS_LABEL[editing.status]}
                </span>
                {editing.status === 'pending' && (
                  <span className="text-xs font-medium tabular-nums text-gourmand-biscuit ml-auto">
                    cuisine {producedPieces(detailCommand.items)}/{totalPieces(detailCommand.items)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FormLabel>Prise</FormLabel>
                  <input
                    type="date"
                    className="gourmand-input w-full text-sm py-2"
                    value={editing.orderDate}
                    onChange={e => setEditing(prev => ({ ...prev, orderDate: e.target.value }))}
                  />
                </div>
                <div>
                  <FormLabel>Livraison</FormLabel>
                  <input
                    type="date"
                    className="gourmand-input w-full text-sm py-2"
                    value={editing.deliveryDate}
                    onChange={e => setEditing(prev => ({ ...prev, deliveryDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <FormLabel>Client</FormLabel>
                <input
                  className="gourmand-input w-full text-base py-2.5"
                  value={editing.clientName}
                  onChange={e => setEditing(prev => ({ ...prev, clientName: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(prev => ({ ...prev, customerType: 'particulier' }))}
                  className={`gourmand-segment-compact min-h-11 cursor-pointer text-sm ${
                    editing.customerType === 'particulier' ? 'gourmand-segment-active' : 'gourmand-segment-idle'
                  }`}
                >
                  Particulier
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(prev => ({ ...prev, customerType: 'pro' }))}
                  className={`gourmand-segment-compact min-h-11 cursor-pointer text-sm ${
                    editing.customerType === 'pro' ? 'gourmand-segment-active' : 'gourmand-segment-idle'
                  }`}
                >
                  Pro
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Bell size={14} className="text-gourmand-biscuit shrink-0" aria-hidden />
                  <span className="text-xs font-semibold text-gourmand-biscuit">Rappels</span>
                  {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
                    <button type="button" onClick={handleRequestPerm} className="ml-auto text-xs font-semibold text-gourmand-chocolate underline cursor-pointer">
                      {notifPerm === 'denied' ? 'Bloqué' : 'Activer'}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {NOTIFY_OPTIONS.map(opt => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => toggleNotify(opt.value)}
                      disabled={notifPerm === 'denied' || notifPerm === 'unsupported'}
                      className={`min-h-9 px-2.5 rounded-lg text-[11px] font-semibold border cursor-pointer disabled:opacity-40 ${
                        editing.notifyBefore.includes(opt.value)
                          ? 'bg-gourmand-chocolate text-white border-gourmand-chocolate'
                          : 'bg-white text-gourmand-biscuit border-gourmand-border'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <FormLabel>Statut</FormLabel>
                <select
                  className="gourmand-input w-full text-base py-2.5"
                  value={editing.status}
                  onChange={e => setEditing(prev => ({ ...prev, status: e.target.value as CommandeStatus }))}
                >
                  <option value="pending">En attente</option>
                  <option value="ready">Prête</option>
                  <option value="delivered">Livrée</option>
                </select>
              </div>

              <div>
                <FormLabel>Notes</FormLabel>
                <textarea
                  className="gourmand-input w-full resize-none min-h-[72px] text-sm py-2"
                  rows={2}
                  value={editing.notes}
                  onChange={e => setEditing(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="border-t border-gourmand-border/70 pt-3 space-y-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gourmand-biscuit">Desserts</span>
                  {editing.status === 'pending' && (
                    <button type="button" onClick={addItem} className="text-xs font-semibold text-gourmand-chocolate cursor-pointer flex items-center gap-0.5">
                      <Plus size={14} /> ligne
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {editing.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 min-w-0 rounded-lg border border-gourmand-border bg-gourmand-bg/20 pl-2 pr-1 py-1">
                      <span className="text-lg shrink-0 w-8 text-center" aria-hidden>
                        {item.dessertEmoji || '🍰'}
                      </span>
                      <select
                        className="gourmand-input flex-1 min-w-0 text-sm py-2"
                        value={item.dessertId || ''}
                        onChange={e => handleDessertChange(idx, e.target.value)}
                        disabled={editing.status !== 'pending'}
                      >
                        <option value="">—</option>
                        {desserts.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.emoji} {d.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        disabled={editing.status !== 'pending'}
                        className="gourmand-input w-14 shrink-0 text-center text-sm py-2 px-1 disabled:opacity-50"
                        value={item.quantity}
                        onChange={e => setItem(idx, { quantity: Math.max(1, Math.min(999, Number(e.target.value) || 1)) })}
                      />
                      {editing.items.length > 1 && editing.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="shrink-0 p-2 text-red-400 hover:bg-red-50 rounded-lg cursor-pointer"
                          aria-label="Supprimer la ligne"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => void handleSaveDetailCommand()}
                  disabled={saving}
                  className="gourmand-btn-primary w-full cursor-pointer disabled:cursor-not-allowed"
                >
                  {saving ? '…' : 'Enregistrer'}
                </button>
                {detailNext && (
                  <button
                    type="button"
                    onClick={() => void handleAdvanceStatus(detailCommand)}
                    className="min-h-11 w-full rounded-xl border border-gourmand-border bg-white text-sm font-semibold text-gourmand-chocolate flex items-center justify-center gap-2 cursor-pointer active:bg-gourmand-bg"
                  >
                    <Check size={16} strokeWidth={2.5} aria-hidden />
                    {STATUS_NEXT_LABEL[detailCommand.status]}
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(detailCommand)}
                    className="min-h-11 rounded-xl border border-red-100 text-sm font-semibold text-red-500 active:bg-red-50 cursor-pointer"
                  >
                    Supprimer
                  </button>
                  <button type="button" onClick={() => setDetailCommand(null)} className="min-h-11 rounded-xl border border-gourmand-border text-sm font-semibold text-gourmand-cocoa cursor-pointer">
                    Fermer
                  </button>
                </div>
              </div>
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

      <AnimatePresence>
        {deliverTarget && (
          <Modal title="Marquer comme livrée ?" onClose={() => !converting && setDeliverTarget(null)}>
            <div className="p-5 space-y-5">
              <p className="text-sm text-gourmand-cocoa/75 font-medium leading-relaxed">
                Enregistrer cette commande comme vente dans le Dashboard ?
              </p>
              <div className="bg-gourmand-bg rounded-xl p-3 space-y-1.5">
                {mergeCommandeItems(deliverTarget.items).map((item, i) => (
                  <p key={i} className="text-sm font-medium break-words">
                    <span className="mr-1">{item.dessertEmoji || '🍰'}</span>
                    {item.quantity}× {item.dessertName || '–'}
                  </p>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleConfirmDeliver(true)}
                disabled={converting}
                className="gourmand-btn-primary-compact w-full cursor-pointer disabled:cursor-not-allowed"
              >
                {converting ? 'Enregistrement…' : 'Enregistrer + Livrer'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeliver(false)}
                disabled={converting}
                className="w-full rounded-lg border border-gourmand-border bg-white py-2.5 text-xs font-semibold text-gourmand-cocoa active:bg-gourmand-bg disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
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
