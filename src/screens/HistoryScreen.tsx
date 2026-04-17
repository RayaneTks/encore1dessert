import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Trash2, ChevronDown, X, Layers, Award, LayoutDashboard } from 'lucide-react';
import { HistoryEntry } from '../types';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { fmt, fmtPct, computeGlobalStats } from '../lib/calculations';

interface Props {
  history: HistoryEntry[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const HistoryScreen: React.FC<Props> = ({ history, setHistory, showToast }) => {
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HistoryEntry | null>(null);
  const stats = useMemo(() => computeGlobalStats(history), [history]);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setHistory(prev => prev.filter(h => h.id !== deleteTarget.id));
    showToast('Enregistrement supprimé', 'info');
    setDeleteTarget(null);
    setSelectedEntry(null);
  };

  const marginColor = (rate: number) => {
    if (rate >= 0.6) return 'text-emerald-500';
    if (rate >= 0.4) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full overflow-y-auto scrollbar-hide px-2 pb-32"
    >
      <PageHeader
        title="Dashboard"
        description={`Performances globales basées sur ${stats.totalSales} point${stats.totalSales > 1 ? 's' : ''} de vente.`}
      />

      <div className="px-4 space-y-5">
        {/* Main KPIs */}
        <div className="space-y-3">
          <div className="gourmand-card-dark p-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-2">Chiffre d'Affaires</p>
            <p className="text-4xl font-bold tracking-tight mb-4">{fmt(stats.totalRevenue)}</p>
            <div className="grid grid-cols-2 gap-4 border-t border-gourmand-border/20 pt-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1">Bénéfice Net</p>
                <p className="text-xl font-semibold text-emerald-400">{fmt(stats.totalProfit)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1">Total Coûts</p>
                <p className="text-xl font-semibold text-gourmand-white">{fmt(stats.totalCost)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="gourmand-card p-4 flex flex-col justify-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1">Taux de Marge</p>
              <p className={`text-2xl font-bold ${marginColor(stats.marginRate)}`}>{fmtPct(stats.marginRate)}</p>
            </div>
            <div className="gourmand-card p-4 flex flex-col justify-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1">Desserts vendus</p>
              <p className="text-2xl font-bold">{stats.totalDessertsSold}</p>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        {(stats.topVolume || stats.topProfit) && (
          <SectionCard title="Performance des produits">
            <div className="grid grid-cols-2 gap-px bg-gourmand-border overflow-hidden rounded-xl">
              {stats.topVolume && (
                <div className="bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase text-gourmand-biscuit mb-2 flex items-center gap-1.5"><Layers size={14} /> Top Volume</p>
                  <p className="font-semibold text-sm truncate">{stats.topVolume.name}</p>
                  <p className="text-xs text-gourmand-chocolate/60 mt-1">{stats.topVolume.count} ventes</p>
                </div>
              )}
              {stats.topProfit && (
                <div className="bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase text-gourmand-biscuit mb-2 flex items-center gap-1.5"><Award size={14} /> Top Rentabilité</p>
                  <p className="font-semibold text-sm truncate">{stats.topProfit.name}</p>
                  <p className="text-xs text-emerald-500 font-medium mt-1">Marge: {fmt(stats.topProfit.profit)}</p>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Sales History */}
        <SectionCard title="Dernières transactions" padding={false}>
          {history.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gourmand-bg flex items-center justify-center mx-auto mb-3">
                <LayoutDashboard size={28} className="text-gourmand-biscuit" />
              </div>
              <p className="font-semibold text-sm text-gourmand-chocolate mb-1">Aucune donnée</p>
              <p className="text-xs text-gourmand-biscuit">Les ventes apparaîtront ici.</p>
            </div>
          ) : (
            <div className="divide-y divide-gourmand-border/60">
              {history.slice(0, 20).map(h => (
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
                        {new Date(h.date).toLocaleDateString('fr-FR')} - {new Date(h.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
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
              {history.length > 20 && (
                 <div className="p-3 text-center text-xs font-semibold text-gourmand-biscuit bg-gourmand-bg/30">
                   Affichage des 20 dernières transactions
                 </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Entry Detail Modal */}
      <AnimatePresence>
        {selectedEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center px-4 pb-12 sm:pb-32"
          >
            <div className="absolute inset-0 bg-gourmand-chocolate/40 backdrop-blur-sm" onClick={() => setSelectedEntry(null)} />
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="relative w-full max-w-[400px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-gourmand-border flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1">
                    {new Date(selectedEntry.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  <h3 className="text-lg font-bold tracking-tight">
                    {selectedEntry.dessertEmoji} {selectedEntry.quantitySold}× {selectedEntry.dessertName}
                  </h3>
                </div>
                <button onClick={() => setSelectedEntry(null)} className="w-8 h-8 rounded-full bg-gourmand-bg flex items-center justify-center text-gourmand-chocolate">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Sale KPIs */}
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

                <div className="bg-gourmand-bg rounded-xl p-4 space-y-2.5">
                   <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-2">Données unitaires figées</p>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-gourmand-chocolate font-medium">Prix unitaire</span>
                      <span className="font-semibold">{fmt(selectedEntry.unitPrice)}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-gourmand-chocolate font-medium">Coût unitaire</span>
                      <span className="font-semibold">{fmt(selectedEntry.unitCost)}</span>
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
            title="Supprimer la transaction"
            message={`Voulez-vous supprimer cette vente de ${fmt(deleteTarget.totalRevenue)} ? Elle ne sera plus comptée dans vos statistiques.`}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
