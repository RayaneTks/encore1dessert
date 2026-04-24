import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, ChevronDown, X, Settings, ChevronRight, RotateCcw } from 'lucide-react';
import { HistoryEntry, Commande, Tab, StatPeriod } from '../types';
import { PageHeader } from '../components/PageHeader';
import { IconActionButton } from '../components/IconActionButton';
import { FilterPillRow, FilterSortByCustomer, FilterField } from '../components/FilterControls';
import { SectionCard } from '../components/SectionCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { fmt, fmtPct, computeGlobalStats, filterHistoryByPeriod, filterHistoryByCustomerType } from '../lib/calculations';

interface Props {
  history: HistoryEntry[];
  commandes: Commande[];
  setActiveTab: (tab: Tab) => void;
  onDelete: (id: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PERIODS: { value: StatPeriod; label: string }[] = [
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'all', label: 'Tout' },
];

export const HistoryScreen: React.FC<Props> = ({ history, commandes, setActiveTab, onDelete, showToast }) => {
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HistoryEntry | null>(null);
  const [period, setPeriod] = useState<StatPeriod>('month');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'particulier' | 'pro'>('all');

  const filteredHistory = useMemo(() => {
    const byPeriod = filterHistoryByPeriod(history, period);
    return filterHistoryByCustomerType(byPeriod, customerFilter);
  }, [history, period, customerFilter]);
  const stats = useMemo(() => computeGlobalStats(filteredHistory), [filteredHistory]);

  const todayISO = new Date().toISOString().split('T')[0];
  const todayCommandes = useMemo(
    () => commandes.filter(c => c.deliveryDate === todayISO && c.status !== 'delivered'),
    [commandes, todayISO],
  );

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await onDelete(deleteTarget.id);
    showToast('Enregistrement supprimé', 'info');
    setDeleteTarget(null);
    setSelectedEntry(null);
  };

  const marginColor = (rate: number) => {
    if (rate >= 0.6) return 'text-emerald-500';
    if (rate >= 0.4) return 'text-amber-500';
    return 'text-red-500';
  };

  const periodLabel = period === 'week' ? '7 derniers jours' : period === 'month' ? '30 derniers jours' : 'Depuis le début';
  const hasCustomFilters = period !== 'month' || customerFilter !== 'all';
  const customerLabel = customerFilter === 'all' ? 'Tous clients' : customerFilter === 'pro' ? 'Clients Pro' : 'Clients Particuliers';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full overflow-y-auto scrollbar-hide px-2 pb-32"
    >
      <PageHeader
        title="Dashboard"
        description={`${periodLabel} · ${stats.totalSales} vente${stats.totalSales > 1 ? 's' : ''}`}
        action={
          <IconActionButton
            size="compact"
            onClick={() => setActiveTab('settings')}
            icon={<Settings size={18} strokeWidth={2} />}
            label="Ouvrir les réglages"
          />
        }
      />

      <div className="px-4 space-y-4">
        <div className="min-w-0 space-y-3 pt-1">
          {hasCustomFilters && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setPeriod('month');
                  setCustomerFilter('all');
                }}
                className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-gourmand-biscuit transition-colors hover:bg-gourmand-border/40 hover:text-gourmand-chocolate active:scale-[0.98]"
              >
                <RotateCcw size={12} aria-hidden />
                Réinitialiser
              </button>
            </div>
          )}
          <FilterField
            label="Période"
            footer={<FilterSortByCustomer value={customerFilter} onChange={setCustomerFilter} />}
          >
            <FilterPillRow
              options={PERIODS.map(p => ({ value: p.value, label: p.label }))}
              value={period}
              onChange={setPeriod}
              aria-label="Filtrer par période"
            />
          </FilterField>
          <p className="px-0.5 text-xs text-gourmand-biscuit/80">
            {periodLabel} · {customerLabel}
          </p>
        </div>

        {/* Banner commandes du jour */}
        <AnimatePresence>
          {todayCommandes.length > 0 && (
            <motion.button
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onClick={() => setActiveTab('commandes')}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-orange-50 border border-orange-200 text-left overflow-hidden"
            >
              <span className="text-xl flex-shrink-0">📦</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-orange-700">
                  {todayCommandes.length} commande{todayCommandes.length > 1 ? 's' : ''} à livrer aujourd'hui
                </p>
                <p className="text-[10px] text-orange-600/80 truncate">
                  {todayCommandes.map(c => c.clientName).join(', ')}
                </p>
              </div>
              <ChevronRight size={14} className="text-orange-400 flex-shrink-0" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Hero KPI card */}
        <div className="gourmand-card-dark p-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-2">Chiffre d'Affaires</p>
          <p className="text-4xl font-bold tracking-tight mb-4">{fmt(stats.totalRevenue)}</p>
          <div className="grid grid-cols-2 gap-4 border-t border-gourmand-border/20 pt-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1">Bénéfice</p>
              <p className="text-xl font-semibold text-emerald-400">{fmt(stats.totalProfit)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1">Coût matières</p>
              <p className="text-xl font-semibold text-gourmand-white">{fmt(stats.totalCost)}</p>
            </div>
          </div>
        </div>

        {/* Grid 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="gourmand-card p-4 flex flex-col justify-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1">Marge</p>
            <p className={`text-2xl font-bold ${marginColor(stats.marginRate)}`}>{fmtPct(stats.marginRate)}</p>
          </div>
          <div className="gourmand-card p-4 flex flex-col justify-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1">Pièces vendues</p>
            <p className="text-2xl font-bold">{stats.totalDessertsSold}</p>
          </div>
          <div className="gourmand-card p-4 flex flex-col justify-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1">Transactions</p>
            <p className="text-2xl font-bold">{stats.totalSales}</p>
          </div>
          <div className="gourmand-card p-4 flex flex-col justify-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1">Moy. / vente</p>
            <p className="text-xl font-bold">{fmt(stats.avgMarginPerSale)}</p>
          </div>
        </div>

        {/* Top 3 desserts */}
        {stats.top3Profit && stats.top3Profit.length > 0 && (
          <SectionCard title="Top rentabilité">
            <div className="space-y-1">
              {stats.top3Profit.map((d, idx) => (
                <div key={d.name} className="flex items-center gap-3 py-2">
                  <span className={`text-[11px] font-black w-5 text-center ${idx === 0 ? 'text-amber-500' : 'text-gourmand-biscuit'}`}>
                    {idx + 1}
                  </span>
                  <span className="text-lg">{d.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{d.name}</p>
                    <p className="text-[10px] text-gourmand-biscuit">{d.count} pièce{d.count > 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600">{fmt(d.profit)}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Transactions */}
        <SectionCard title="Transactions" padding={false}>
          {filteredHistory.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-semibold text-sm text-gourmand-chocolate mb-1">
                {period === 'all' ? 'Aucune vente' : 'Aucune vente sur cette période'}
              </p>
              <p className="text-[11px] text-gourmand-biscuit">
                {period !== 'all' ? "Essaie \"Tout\" pour voir l'historique complet" : 'Enregistre ta première vente dans Vendre'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gourmand-border/60">
              {filteredHistory.slice(0, 15).map(h => (
                <button
                  key={h.id}
                  onClick={() => setSelectedEntry(h)}
                  className="w-full p-4 flex justify-between items-center hover:bg-gourmand-bg/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{h.dessertEmoji}</span>
                    <div>
                      <p className="font-medium text-sm text-gourmand-chocolate">{h.quantitySold}× {h.dessertName}</p>
                      <p className="text-[10px] font-medium text-gourmand-biscuit mt-0.5">
                        {new Date(h.date).toLocaleDateString('fr-FR')} · {new Date(h.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        h.customerType === 'pro'
                          ? 'bg-gourmand-chocolate text-white'
                          : 'bg-gourmand-bg text-gourmand-biscuit border border-gourmand-border'
                      }`}>
                        {h.customerType === 'pro' ? 'Pro' : 'Particulier'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-sm">{fmt(h.totalRevenue)}</p>
                      <p className="text-[10px] font-medium text-emerald-500">+{fmt(h.totalProfit)}</p>
                    </div>
                    <ChevronDown size={14} className="text-gourmand-biscuit -rotate-90" />
                  </div>
                </button>
              ))}
              {filteredHistory.length > 15 && (
                <p className="text-center text-[10px] text-gourmand-biscuit py-3 font-medium">
                  +{filteredHistory.length - 15} transactions · change de période pour filtrer
                </p>
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Modale détail transaction */}
      <AnimatePresence>
        {selectedEntry && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-end justify-center px-4 pb-12 sm:pb-32">
            <div className="absolute inset-0 bg-gourmand-chocolate/40 backdrop-blur-sm" onClick={() => setSelectedEntry(null)} />
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="relative w-full max-w-[400px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-gourmand-border flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1">
                    {new Date(selectedEntry.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  <h3 className="text-lg font-bold tracking-tight">{selectedEntry.dessertEmoji} {selectedEntry.quantitySold}× {selectedEntry.dessertName}</h3>
                  <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    selectedEntry.customerType === 'pro'
                      ? 'bg-gourmand-chocolate text-white'
                      : 'bg-gourmand-bg text-gourmand-biscuit border border-gourmand-border'
                  }`}>
                    {selectedEntry.customerType === 'pro' ? 'Pro' : 'Particulier'}
                  </span>
                </div>
                <button onClick={() => setSelectedEntry(null)} className="w-8 h-8 rounded-full bg-gourmand-bg flex items-center justify-center text-gourmand-chocolate"><X size={18} /></button>
              </div>

              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gourmand-bg rounded-xl p-3">
                    <p className="text-[10px] font-semibold uppercase text-gourmand-biscuit mb-1">C.A. Total</p>
                    <p className="font-bold text-base">{fmt(selectedEntry.totalRevenue)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-[10px] font-semibold uppercase text-emerald-600 mb-1">Bénéfice</p>
                    <p className="font-bold text-base text-emerald-700">{fmt(selectedEntry.totalProfit)}</p>
                  </div>
                  <div className="bg-gourmand-bg rounded-xl p-3">
                    <p className="text-[10px] font-semibold uppercase text-gourmand-biscuit mb-1">Coût Total</p>
                    <p className="font-bold text-sm text-gourmand-chocolate/80">{fmt(selectedEntry.totalCost)}</p>
                  </div>
                  <div className="bg-gourmand-bg rounded-xl p-3">
                    <p className="text-[10px] font-semibold uppercase text-gourmand-biscuit mb-1">Marge</p>
                    <p className={`font-bold text-sm ${marginColor(selectedEntry.marginRate)}`}>{fmtPct(selectedEntry.marginRate)}</p>
                  </div>
                </div>

                <button
                  onClick={() => { setSelectedEntry(null); setDeleteTarget(selectedEntry); }}
                  className="w-full py-4 text-[11px] font-bold uppercase tracking-widest text-red-500 bg-red-50 rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={16} /> Annuler la transaction
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDialog
            title="Annulation"
            message="Supprimer cette vente définitivement ?"
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
