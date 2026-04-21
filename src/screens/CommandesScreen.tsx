import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Check, Package, Clock, ChevronRight, Bell, BellOff, X } from 'lucide-react';
import { Commande, CommandeItem, CommandeStatus, NotifyBefore, Dessert } from '../types';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
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
  onAddSale: (dessert: Dessert, quantity: number) => Promise<void>;
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

const todayISO = new Date().toISOString().split('T')[0];

const BLANK_ITEM: CommandeItem = { dessertId: null, dessertName: '', dessertEmoji: '🍰', quantity: 1 };

const BLANK: Commande = {
  id: 'cmd-new',
  clientName: '',
  items: [{ ...BLANK_ITEM }],
  orderDate: todayISO,
  deliveryDate: todayISO,
  notes: '',
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
          await onAddSale(dessert, item.quantity);
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
        description={`${pendingCount} en attente · ${commandes.length} total`}
        action={
          <button
            onClick={openNew}
            className="w-10 h-10 rounded-full bg-gourmand-chocolate text-white flex items-center justify-center shadow-md flex-shrink-0"
          >
            <Plus size={20} />
          </button>
        }
      />

      {/* Filtres */}
      <div className="px-4 pb-4 flex gap-2 overflow-x-auto scrollbar-hide">
        {(['all', 'pending', 'ready', 'delivered'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-gourmand-chocolate text-white'
                : 'bg-gourmand-bg text-gourmand-biscuit border border-gourmand-border'
            }`}
          >
            {f === 'all' ? 'Toutes' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {/* Banner permission notif */}
      {notifPerm === 'default' && isNotificationSupported() && (
        <div className="mx-4 mb-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3">
          <Bell size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-[11px] text-amber-700 font-medium flex-1">Autorise les notifications pour les rappels de commandes</p>
          <button onClick={handleRequestPerm} className="text-[11px] font-bold text-amber-700 underline whitespace-nowrap">Activer</button>
        </div>
      )}
      {notifPerm === 'denied' && (
        <div className="mx-4 mb-3 p-3 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3">
          <BellOff size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-[11px] text-red-600 font-medium">{'Notifications bloquées. Autorise dans Réglages > Safari > Notifications.'}</p>
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
                className={`gourmand-card border-2 p-4 cursor-pointer ${urgencyClass(cmd.deliveryDate, cmd.status)}`}
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
                      {badge && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto ${
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
                      <span className="flex items-center gap-1 text-[10px] text-gourmand-biscuit">
                        <Clock size={10} />
                        {formatDate(cmd.deliveryDate)}
                      </span>
                      <span className="text-[10px] text-gourmand-biscuit">
                        {pieces} pièce{pieces > 1 ? 's' : ''}
                      </span>
                      {cmd.notifyBefore.length > 0 && (
                        <Bell size={10} className="text-gourmand-biscuit/60" />
                      )}
                    </div>
                    {cmd.notes ? (
                      <p className="text-[10px] text-gourmand-biscuit/70 mt-1 italic truncate">{cmd.notes}</p>
                    ) : null}
                  </div>
                  <ChevronRight size={16} className="text-gourmand-biscuit/40 flex-shrink-0 mt-1" />
                </div>

                {nextStatus && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gourmand-border/50">
                    <button
                      onClick={e => { e.stopPropagation(); handleAdvanceStatus(cmd); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gourmand-chocolate text-white text-[11px] font-semibold"
                    >
                      <Check size={12} />
                      {STATUS_NEXT_LABEL[cmd.status]}
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(cmd); }}
                      className="ml-auto p-1.5 rounded-xl text-red-400 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
                {!nextStatus && (
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteTarget(cmd); }}
                      className="p-1.5 rounded-xl text-red-300 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
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
            <div className="p-6 space-y-5">

              {/* Client */}
              <div>
                <label className="text-xs font-bold text-gourmand-biscuit uppercase tracking-wider mb-1.5 block">Nom du client</label>
                <input
                  className="gourmand-input w-full"
                  placeholder="Ex : Marie Dupont"
                  value={editing.clientName}
                  onChange={e => setEditing(prev => ({ ...prev, clientName: e.target.value }))}
                />
              </div>

              {/* Desserts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gourmand-biscuit uppercase tracking-wider">Desserts commandés</label>
                  <button
                    onClick={addItem}
                    className="flex items-center gap-1 text-[11px] font-semibold text-gourmand-chocolate"
                  >
                    <Plus size={12} /> Ajouter
                  </button>
                </div>
                <div className="space-y-2">
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
                  <label className="text-xs font-bold text-gourmand-biscuit uppercase tracking-wider mb-1.5 block">Commande le</label>
                  <input
                    type="date"
                    className="gourmand-input w-full"
                    value={editing.orderDate}
                    onChange={e => setEditing(prev => ({ ...prev, orderDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gourmand-biscuit uppercase tracking-wider mb-1.5 block">Livraison le</label>
                  <input
                    type="date"
                    className="gourmand-input w-full"
                    value={editing.deliveryDate}
                    onChange={e => setEditing(prev => ({ ...prev, deliveryDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Notifications */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Bell size={13} className="text-gourmand-biscuit" />
                  <label className="text-xs font-bold text-gourmand-biscuit uppercase tracking-wider">Rappels</label>
                  {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
                    <button onClick={handleRequestPerm} className="ml-auto text-[10px] font-bold text-gourmand-biscuit underline">
                      {notifPerm === 'denied' ? 'Bloqué' : 'Activer'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {NOTIFY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => toggleNotify(opt.value)}
                      disabled={notifPerm === 'denied' || notifPerm === 'unsupported'}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all disabled:opacity-40 ${
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
                  <p className="text-[10px] text-gourmand-biscuit/60 mt-1.5">Notifications non supportées sur cet appareil.</p>
                )}
                {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
                  <p className="text-[10px] text-gourmand-biscuit/60 mt-1.5">Active les notifications pour recevoir des rappels à 8h.</p>
                )}
              </div>

              {/* Statut (edit only) */}
              {editing.id !== 'cmd-new' && (
                <div>
                  <label className="text-xs font-bold text-gourmand-biscuit uppercase tracking-wider mb-1.5 block">Statut</label>
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
                <label className="text-xs font-bold text-gourmand-biscuit uppercase tracking-wider mb-1.5 block">Notes</label>
                <textarea
                  className="gourmand-input w-full resize-none"
                  rows={2}
                  placeholder="Allergies, adresse, personnalisation…"
                  value={editing.notes}
                  onChange={e => setEditing(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="gourmand-btn-primary w-full py-4 text-sm"
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
            <div className="p-6 space-y-4">
              <p className="text-sm text-gourmand-cocoa/70 font-medium leading-relaxed">
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
                onClick={() => handleConfirmDeliver(true)}
                disabled={converting}
                className="gourmand-btn-primary w-full py-4 text-sm"
              >
                {converting ? 'Enregistrement…' : 'Enregistrer + Livrer'}
              </button>
              <button
                onClick={() => handleConfirmDeliver(false)}
                disabled={converting}
                className="w-full py-3 text-sm font-bold text-gourmand-biscuit text-center disabled:opacity-40"
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
