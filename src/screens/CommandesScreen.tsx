import React, { useState, useMemo, useCallback } from 'react';
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
  Pencil,
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
  const parts = items.filter(i => i.dessertName).map(i => `${i.quantity}× ${i.dessertName}`);
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

function UnitCircles({
  quantity,
  produced,
  onChange,
  disabled,
}: {
  quantity: number;
  produced: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const q = Math.max(0, Math.floor(quantity));
  const p = Math.min(q, Math.max(0, Math.floor(produced)));
  if (q === 0) return null;
  return (
    <div
      className="flex flex-wrap gap-1.5 w-full min-w-0"
      role="group"
      aria-label={`${p} sur ${q} unités indiquées comme fabriquées`}
    >
      {Array.from({ length: q }, (_, i) => {
        const filled = i < p;
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            aria-pressed={filled}
            aria-label={filled ? `Réduire la progression (après ${i} unité(s))` : `Marquer ${i + 1} unité(s) comme faites`}
            onClick={() => onChange(nextProducedTap(i, p, q))}
            className={`h-8 w-8 shrink-0 rounded-full border-2 transition-colors duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gourmand-chocolate ${
              filled
                ? 'border-emerald-600 bg-emerald-500 text-white shadow-sm'
                : 'border-gourmand-border bg-white text-transparent hover:border-gourmand-cocoa/40'
            }`}
          >
            {filled ? <Check size={14} className="mx-auto" strokeWidth={2.5} aria-hidden /> : null}
          </button>
        );
      })}
    </div>
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

  const openNew = () => {
    setEditing({ ...BLANK, id: 'cmd-new', items: [{ ...BLANK_ITEM }], orderDate: todayISO, deliveryDate: todayISO });
    setFormOpen(true);
  };

  const openDetail = (cmd: Commande) => {
    setDetailCommand({ ...cmd, items: normalizeCommandeItems(cmd.items.map(i => ({ ...i }))) });
  };

  const openEditFromDetail = () => {
    if (!detailCommand) return;
    setEditing({ ...detailCommand, items: detailCommand.items.map(i => ({ ...i })) });
    setDetailCommand(null);
    setFormOpen(true);
  };

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

  const addItem = () => setEditing(prev => ({ ...prev, items: [...prev.items, { ...BLANK_ITEM }] }));

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
    let nextStatus = editing.status;
    if (nextStatus === 'ready' && !commandeProductionComplete({ ...editing, items: validItems })) {
      showToast('Tous les desserts doivent être validés en cuisine avant « Prête ».', 'error');
      nextStatus = 'pending';
    }
    setSaving(true);
    try {
      await persistCommande(
        { ...editing, items: validItems, status: nextStatus },
        editing.id === 'cmd-new' ? 'Commande créée ✓' : 'Commande mise à jour ✓',
      );
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAdvanceStatus = async (cmd: Commande) => {
    const next = STATUS_NEXT[cmd.status];
    if (!next) return;
    if (next === 'ready') {
      if (!commandeProductionComplete(cmd)) {
        showToast('Termine la production en cuisine (tous les desserts) avant de marquer la commande prête.', 'error');
        setScreenTab('cuisine');
        return;
      }
      await persistCommande({ ...cmd, status: next }, `${STATUS_LABEL[next]} ✓`);
      setDetailCommand(prev => (prev && prev.id === cmd.id ? { ...prev, status: 'ready' } : prev));
      return;
    }
    if (next === 'delivered') {
      setDeliverTarget(cmd);
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
              ? `${pendingCount} commande(s) en attente · ${commandes.length} au total · ${remainingKitchen} dessert(s) restant(s) en cuisine`
              : `${pendingCount} en attente · ${commandes.length} commande(s)`
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

        <div className="px-4 pb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setScreenTab('commandes')}
            className={`flex flex-1 min-w-0 items-center justify-center gap-2 rounded-xl py-2.5 px-2 text-xs font-semibold transition-colors duration-200 cursor-pointer border ${
              screenTab === 'commandes'
                ? 'bg-gourmand-chocolate text-white border-gourmand-chocolate'
                : 'bg-white text-gourmand-cocoa border-gourmand-border'
            }`}
          >
            <ClipboardList size={16} className="shrink-0" aria-hidden />
            <span className="truncate">Commandes</span>
          </button>
          <button
            type="button"
            onClick={() => setScreenTab('cuisine')}
            className={`flex flex-1 min-w-0 items-center justify-center gap-2 rounded-xl py-2.5 px-2 text-xs font-semibold transition-colors duration-200 cursor-pointer border relative ${
              screenTab === 'cuisine'
                ? 'bg-gourmand-chocolate text-white border-gourmand-chocolate'
                : 'bg-white text-gourmand-cocoa border-gourmand-border'
            }`}
          >
            <ChefHat size={16} className="shrink-0" aria-hidden />
            <span className="truncate">Cuisine</span>
            {remainingKitchen > 0 && (
              <span
                className={`absolute -top-1.5 -right-1.5 min-w-[1.125rem] h-[1.125rem] px-1 flex items-center justify-center rounded-full text-[10px] font-bold ${
                  screenTab === 'cuisine' ? 'bg-white text-gourmand-chocolate' : 'bg-amber-500 text-white'
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
                <p className="text-xs text-amber-800 font-medium flex-1 min-w-0">
                  Autorise les notifications pour les rappels de commandes
                </p>
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
                  <p className="text-xs text-red-700 font-medium">
                    Notifications bloquées. Autorise dans Réglages &gt; Safari &gt; Notifications.
                  </p>
                </div>
              </div>
            )}

            <div className="px-2 space-y-3">
              {filtered.length === 0 && (
                <div className="text-center py-16 text-gourmand-biscuit">
                  <Package size={40} className="mx-auto mb-3 opacity-30" aria-hidden />
                  <p className="text-sm font-medium">Aucune commande</p>
                  <p className="text-xs opacity-60 mt-1">Appuie sur + pour en ajouter une</p>
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
                        <div className="flex flex-col items-center gap-0.5 shrink-0 mt-0.5">
                          {cmd.items.slice(0, 2).map((it, i) => (
                            <span key={i} className="text-xl leading-none" aria-hidden>
                              {it.dessertEmoji}
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
          <div className="px-2 space-y-4 pb-4">
            <div className="gourmand-card border p-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gourmand-chocolate text-white">
                  <ChefHat size={22} strokeWidth={2} aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gourmand-biscuit">Production globale</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-gourmand-chocolate">
                    {Math.max(0, orderedKitchen - remainingKitchen)}
                    <span className="text-gourmand-biscuit text-base font-semibold"> / {orderedKitchen}</span>
                  </p>
                  <p className="text-xs text-gourmand-cocoa mt-1">
                    {remainingKitchen === 0 && orderedKitchen > 0
                      ? 'Tout est prêt pour les commandes en attente.'
                      : remainingKitchen > 0
                        ? `${remainingKitchen} unité(s) encore à cocher (commandes en attente).`
                        : 'Aucune commande en attente avec desserts.'}
                  </p>
                </div>
              </div>
              {orderedKitchen > 0 && (
                <div
                  className="mt-3"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={kitchenPct}
                  aria-label="Progression de la production cuisine"
                >
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gourmand-bg">
                    <div
                      className="h-full rounded-full bg-emerald-600 transition-[width] duration-300 ease-out"
                      style={{ width: `${kitchenPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {kitchenGroups.length === 0 && (
              <div className="text-center py-12 text-gourmand-biscuit">
                <ChefHat size={36} className="mx-auto mb-3 opacity-25" aria-hidden />
                <p className="text-sm font-medium">Rien à produire</p>
                <p className="text-xs opacity-70 mt-1 max-w-xs mx-auto">
                  Les desserts des commandes « En attente » apparaissent ici, regroupés par recette.
                </p>
              </div>
            )}

            <div className="space-y-3">
              {kitchenGroups.map(({ key, lines, name, emoji }) => {
                const remaining = lines.reduce((s, l) => s + (l.item.quantity - clampProducedQty(l.item)), 0);
                const total = lines.reduce((s, l) => s + l.item.quantity, 0);
                const done = total - remaining;
                return (
                  <div key={key} className="gourmand-card border p-4 space-y-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-2xl shrink-0" aria-hidden>
                        {emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-gourmand-chocolate truncate">{name}</h3>
                        <p className="text-[11px] text-gourmand-biscuit tabular-nums">
                          {done}/{total} fait · {remaining} restant{remaining > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-4 divide-y divide-gourmand-border/60">
                      {lines.map(line => {
                        const cmd = commandes.find(c => c.id === line.commandeId);
                        if (!cmd) return null;
                        const p = clampProducedQty(line.item);
                        const q = line.item.quantity;
                        return (
                          <li key={`${line.commandeId}-${line.itemIndex}`} className="pt-4 first:pt-0 space-y-2">
                            <div className="flex flex-wrap items-baseline justify-between gap-2 min-w-0">
                              <p className="text-xs font-semibold text-gourmand-cocoa truncate">{line.clientName}</p>
                              <p className="text-[11px] text-gourmand-biscuit shrink-0 tabular-nums">{formatDate(line.deliveryDate)}</p>
                            </div>
                            <UnitCircles
                              quantity={q}
                              produced={p}
                              onChange={async n => {
                                await patchCommandeItem(cmd, line.itemIndex, { producedQty: n });
                              }}
                            />
                            <p className="text-[11px] text-gourmand-biscuit">
                              {p}/{q} pour cette ligne — ouvre la commande pour le détail complet.
                            </p>
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
          <Modal title={editing.id === 'cmd-new' ? 'Nouvelle commande' : 'Modifier la commande'} onClose={() => setFormOpen(false)}>
            <div className="p-5 space-y-6 max-h-[min(85vh,32rem)] overflow-y-auto scrollbar-hide">
              <div>
                <FormLabel>Nom du client</FormLabel>
                <input
                  className="gourmand-input w-full min-w-0"
                  placeholder="Ex : Marie Dupont"
                  value={editing.clientName}
                  onChange={e => setEditing(prev => ({ ...prev, clientName: e.target.value }))}
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gourmand-biscuit">Desserts commandés</span>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-gourmand-chocolate active:bg-gourmand-bg cursor-pointer"
                  >
                    <Plus size={14} strokeWidth={2.25} /> Ajouter
                  </button>
                </div>
                <div className="space-y-2.5">
                  {editing.items.map((item, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0" aria-hidden>
                        {item.dessertEmoji}
                      </span>
                      <select
                        className="gourmand-input flex-1 min-w-[8rem] text-sm"
                        value={item.dessertId || ''}
                        onChange={e => handleDessertChange(idx, e.target.value)}
                      >
                        <option value="">— Dessert —</option>
                        {desserts.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.emoji} {d.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        className="gourmand-input w-16 shrink-0 text-center"
                        value={item.quantity}
                        onChange={e => setItem(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                      />
                      {editing.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-red-400 shrink-0 p-1 cursor-pointer rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gourmand-chocolate"
                          aria-label="Retirer cette ligne"
                        >
                          <X size={16} />
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
                    className="gourmand-input w-full"
                    value={editing.orderDate}
                    onChange={e => setEditing(prev => ({ ...prev, orderDate: e.target.value }))}
                  />
                </div>
                <div className="min-w-0">
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
                    className={`gourmand-segment-compact cursor-pointer ${
                      editing.customerType === 'particulier' ? 'gourmand-segment-active' : 'gourmand-segment-idle'
                    }`}
                  >
                    Particulier
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(prev => ({ ...prev, customerType: 'pro' }))}
                    className={`gourmand-segment-compact cursor-pointer ${
                      editing.customerType === 'pro' ? 'gourmand-segment-active' : 'gourmand-segment-idle'
                    }`}
                  >
                    Pro
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Bell size={14} className="text-gourmand-biscuit shrink-0" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-wider text-gourmand-biscuit">Rappels</span>
                  {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
                    <button
                      type="button"
                      onClick={handleRequestPerm}
                      className="ml-auto text-[11px] font-semibold text-gourmand-chocolate underline cursor-pointer"
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
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
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
                  <p className="text-[11px] text-gourmand-biscuit mt-2">
                    « Prête » n’est enregistré que si tous les desserts sont validés en cuisine (cercles complets).
                  </p>
                </div>
              )}

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
                className="gourmand-btn-primary-compact w-full cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? 'Enregistrement…' : editing.id === 'cmd-new' ? 'Créer la commande' : 'Enregistrer'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Détail commande */}
      <AnimatePresence>
        {detailCommand && (
          <Modal title={detailCommand.clientName} onClose={() => setDetailCommand(null)}>
            <div className="p-5 space-y-5 max-h-[min(88vh,36rem)] overflow-y-auto scrollbar-hide">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`gourmand-chip ${
                    detailCommand.customerType === 'pro'
                      ? 'bg-gourmand-chocolate text-white'
                      : 'bg-gourmand-bg text-gourmand-biscuit border border-gourmand-border'
                  }`}
                >
                  {detailCommand.customerType === 'pro' ? 'Pro' : 'Particulier'}
                </span>
                <span
                  className={`gourmand-chip ${
                    detailCommand.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : detailCommand.status === 'ready'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {STATUS_LABEL[detailCommand.status]}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex gap-2 text-gourmand-cocoa">
                  <Clock size={16} className="shrink-0 text-gourmand-biscuit mt-0.5" aria-hidden />
                  <div>
                    <p className="text-xs font-semibold text-gourmand-biscuit uppercase tracking-wide">Livraison</p>
                    <p className="font-medium">{formatDate(detailCommand.deliveryDate)}</p>
                  </div>
                </div>
                {detailCommand.notes ? (
                  <div>
                    <p className="text-xs font-semibold text-gourmand-biscuit uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-sm text-gourmand-cocoa whitespace-pre-wrap break-words">{detailCommand.notes}</p>
                  </div>
                ) : null}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gourmand-biscuit mb-3">Desserts & production</p>
                <ul className="space-y-4">
                  {detailCommand.items.map((item, idx) => {
                    const p = clampProducedQty(item);
                    const q = item.quantity;
                    const canEdit = detailCommand.status === 'pending';
                    return (
                      <li key={idx} className="rounded-xl border border-gourmand-border bg-gourmand-bg/40 p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <span className="text-lg shrink-0" aria-hidden>
                            {item.dessertEmoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gourmand-chocolate">{item.dessertName || '—'}</p>
                            <p className="text-[11px] text-gourmand-biscuit tabular-nums">
                              {p}/{q} validé(s) en cuisine
                            </p>
                          </div>
                        </div>
                        <UnitCircles
                          quantity={q}
                          produced={p}
                          disabled={!canEdit}
                          onChange={async n => {
                            await patchCommandeItem(detailCommand, idx, { producedQty: n });
                            setDetailCommand(prev =>
                              prev
                                ? {
                                    ...prev,
                                    items: prev.items.map((it, i) =>
                                      i === idx ? normalizeCommandeItem({ ...it, producedQty: n }) : it,
                                    ),
                                  }
                                : prev,
                            );
                          }}
                        />
                        {!canEdit && (
                          <p className="text-[11px] text-gourmand-biscuit">Production figée (commande prête ou livrée).</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {detailCommand.status === 'pending' && !commandeProductionComplete(detailCommand) && (
                <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  Coche tous les desserts ci-dessus pour pouvoir marquer la commande comme prête.
                </p>
              )}

              <div className="flex flex-col gap-2">
                {detailCommand.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => openEditFromDetail()}
                    className="gourmand-btn-primary-compact w-full cursor-pointer gap-2"
                  >
                    <Pencil size={14} aria-hidden />
                    Modifier la commande
                  </button>
                )}
                {detailNext && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleAdvanceStatus(detailCommand);
                    }}
                    className="gourmand-btn-primary-compact w-full cursor-pointer gap-2"
                  >
                    <Check size={14} strokeWidth={2.5} aria-hidden />
                    {STATUS_NEXT_LABEL[detailCommand.status]}
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(detailCommand)}
                    className="flex-1 rounded-xl border border-red-200 bg-white py-2.5 text-xs font-semibold text-red-600 active:bg-red-50 cursor-pointer transition-colors"
                  >
                    Supprimer
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailCommand(null)}
                    className="flex-1 rounded-xl border border-gourmand-border bg-white py-2.5 text-xs font-semibold text-gourmand-cocoa active:bg-gourmand-bg cursor-pointer transition-colors"
                  >
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
                {deliverTarget.items.map((item, i) => (
                  <p key={i} className="text-sm font-medium break-words">
                    {item.dessertEmoji} {item.quantity}× {item.dessertName || '–'}
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
