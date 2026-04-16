import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, TrendingUp, Award, ShoppingCart, Trash2, ChevronDown, X, Timer } from 'lucide-react';
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
    showToast('Entrée supprimée', 'info');
    setDeleteTarget(null);
    setSelectedEntry(null);
  };

  const marginColor = (rate: number) => {
    if (rate >= 0.6) return 'text-emerald-600';
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
        brand="Comptabilité"
        title="Performances"
        description={`${stats.totalSales} vente${stats.totalSales > 1 ? 's' : ''} · ${stats.totalDessertsSold} desserts vendus`}
      />

      <div className="px-4 space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="gourmand-card-dark p-4">
            <p className="text-[9px] font-black uppercase opacity-50 mb-1">Chiffre d'Affaires</p>
            <p className="text-xl font-black italic tracking-tight">{fmt(stats.totalRevenue)}</p>
          </div>
          <div className="gourmand-card p-4 bg-emerald-50 border-emerald-200">
            <p className="text-[9px] font-black uppercase text-emerald-600 mb-1">Bénéfice Net</p>
            <p className="text-xl font-black italic text-emerald-700 tracking-tight">{fmt(stats.totalProfit)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="gourmand-card p-3 text-center">
            <p className="text-[8px] font-black uppercase text-gourmand-cocoa/40">Coûts</p>
            <p className="font-black text-sm text-gourmand-strawberry">{fmt(stats.totalCost)}</p>
          </div>
          <div className="gourmand-card p-3 text-center">
            <p className="text-[8px] font-black uppercase text-gourmand-cocoa/40">Marge %</p>
            <p className={`font-black text-sm ${marginColor(stats.marginRate)}`}>{fmtPct(stats.marginRate)}</p>
          </div>
          <div className="gourmand-card p-3 text-center">
            <p className="text-[8px] font-black uppercase text-gourmand-cocoa/40">Marge / vente</p>
            <p className="font-black text-sm">{fmt(stats.avgMarginPerSale)}</p>
          </div>
        </div>

        {/* Top desserts */}
        {(stats.topVolume || stats.topProfit) && (
          <div className="grid grid-cols-2 gap-3">
            {stats.topVolume && (
              <div className="gourmand-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart size={14} className="text-gourmand-biscuit" />
                  <p className="text-[9px] font-black uppercase text-gourmand-cocoa/40">Top Volume</p>
                </div>
                <p className="font-black italic text-sm truncate">{stats.topVolume.name}</p>
                <p className="text-[10px] font-bold text-gourmand-cocoa/40">{stats.topVolume.count} vendu{stats.topVolume.count > 1 ? 's' : ''}</p>
              </div>
            )}
            {stats.topProfit && (
              <div className="gourmand-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Award size={14} className="text-gourmand-strawberry" />
                  <p className="text-[9px] font-black uppercase text-gourmand-cocoa/40">Top Marge</p>
                </div>
                <p className="font-black italic text-sm truncate">{stats.topProfit.name}</p>
                <p className="text-[10px] font-bold text-emerald-600">{fmt(stats.topProfit.profit)}</p>
              </div>
            )}
          </div>
        )}

        {/* History Entries */}
        <SectionCard title="Historique des ventes" padding={false}>
          {history.length === 0 ? (
            <div className="p-12 text-center opacity-20">
              <History size={48} className="mx-auto mb-2" />
              <p className="font-bold">Aucune vente enregistrée</p>
              <p className="text-xs mt-1">Allez dans "Vendre" pour enregistrer</p>
            </div>
          ) : (
            <div className="divide-y divide-gourmand-border">
              {history.map(h => (
                <button
                  key={h.id}
                  onClick={() => setSelectedEntry(h)}
                  className="w-full p-4 flex justify-between items-center active:bg-gourmand-bg/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gourmand-bg flex items-center justify-center text-lg">
                      {h.dessertEmoji}
                    </div>
                    <div>
                      <p className="font-black text-sm leading-tight">{h.quantitySold}× {h.dessertName}</p>
                      <p className="text-[9px] font-bold text-gourmand-cocoa/40 mt-0.5">
                        {new Date(h.date).toLocaleDateString('fr-FR')} · {new Date(h.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-black italic leading-tight">{fmt(h.totalRevenue)}</p>
                      <p className="text-[9px] font-black text-emerald-600">+{fmt(h.totalProfit)}</p>
                    </div>
                    <ChevronDown size={14} className="text-gourmand-cocoa/20 -rotate-90" />
                  </div>
                </button>
              ))}
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
            className="fixed inset-0 z-[200] flex items-end justify-center px-4 pb-12"
          >
            <div className="absolute inset-0 bg-gourmand-chocolate/40 backdrop-blur-sm" onClick={() => setSelectedEntry(null)} />
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="relative w-full max-w-[400px] bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-gourmand-border flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black uppercase text-gourmand-cocoa/40">
                    {new Date(selectedEntry.date).toLocaleDateString('fr-FR')} · {new Date(selectedEntry.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <h3 className="text-lg font-black italic tracking-tight mt-1">
                    {selectedEntry.dessertEmoji} {selectedEntry.quantitySold}× {selectedEntry.dessertName}
                  </h3>
                </div>
                <button onClick={() => setSelectedEntry(null)} className="w-8 h-8 rounded-full bg-gourmand-bg flex items-center justify-center">
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto scrollbar-hide p-5 space-y-4">
                {/* Summary KPIs */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gourmand-bg rounded-xl p-3 text-center">
                    <p className="text-[8px] font-black uppercase text-gourmand-cocoa/40">CA</p>
                    <p className="font-black text-sm">{fmt(selectedEntry.totalRevenue)}</p>
                  </div>
                  <div className="bg-gourmand-bg rounded-xl p-3 text-center">
                    <p className="text-[8px] font-black uppercase text-gourmand-cocoa/40">Coût</p>
                    <p className="font-black text-sm text-gourmand-strawberry">{fmt(selectedEntry.totalCost)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-[8px] font-black uppercase text-emerald-600">Marge</p>
                    <p className="font-black text-sm text-emerald-700">{fmt(selectedEntry.totalProfit)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gourmand-bg rounded-xl p-3 text-center">
                    <p className="text-[8px] font-black uppercase text-gourmand-cocoa/40">Prix unit.</p>
                    <p className="font-black text-xs">{fmt(selectedEntry.unitPrice)}</p>
                  </div>
                  <div className="bg-gourmand-bg rounded-xl p-3 text-center">
                    <p className="text-[8px] font-black uppercase text-gourmand-cocoa/40">Coût unit.</p>
                    <p className="font-black text-xs">{fmt(selectedEntry.unitCost)}</p>
                  </div>
                  <div className="bg-gourmand-bg rounded-xl p-3 text-center">
                    <p className="text-[8px] font-black uppercase text-gourmand-cocoa/40">Taux</p>
                    <p className={`font-black text-xs ${marginColor(selectedEntry.marginRate)}`}>{fmtPct(selectedEntry.marginRate)}</p>
                  </div>
                </div>

                {/* Snapshot Lines — Prix figés */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gourmand-cocoa/40 mb-3">
                    Détail du coût (prix figés à la vente)
                  </p>
                  <div className="bg-gourmand-bg rounded-2xl p-4 space-y-2">
                    {selectedEntry.linesSnapshot.map((line, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="font-bold text-gourmand-cocoa/70 flex items-center gap-2">
                          {line.type === 'base' ? <Timer size={12} className="text-gourmand-strawberry" /> : null}
                          {line.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-gourmand-cocoa/40 font-medium text-xs">{line.quantity}{line.unitLabel}</span>
                          <span className="font-black w-16 text-right">{fmt(line.lineCost)}</span>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-gourmand-border pt-2 mt-2 flex justify-between">
                      <span className="text-sm font-black text-gourmand-cocoa/60 uppercase">Coût unitaire</span>
                      <span className="font-black text-gourmand-strawberry">{fmt(selectedEntry.unitCost)}</span>
                    </div>
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => { setSelectedEntry(null); setDeleteTarget(selectedEntry); }}
                  className="w-full py-3 text-[11px] font-black uppercase tracking-widest text-red-400 flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Supprimer cette entrée
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDialog
            title="Supprimer l'entrée"
            message={`${deleteTarget.quantitySold}× ${deleteTarget.dessertName} du ${new Date(deleteTarget.date).toLocaleDateString('fr-FR')} sera supprimé de la compta.`}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
