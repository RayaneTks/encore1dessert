import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, TrendingUp, Check } from 'lucide-react';
import { Dessert, RawIngredient, Base } from '../types';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import {
  fmt,
  calculateDessertCost,
  resolveComponentName,
  resolveComponentUnit,
  findIngredient,
  findBase,
  calculateBaseCostPerKg,
  createFullSnapshot,
} from '../lib/calculations';

interface Props {
  desserts: Dessert[];
  ingredients: RawIngredient[];
  bases: Base[];
  onValidate: (dessert: Dessert, quantity: number, overridePrice?: number) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CalculateScreen: React.FC<Props> = ({ desserts, ingredients, bases, onValidate, showToast }) => {
  const [selectedId, setSelectedId] = useState<string>(desserts[0]?.id || '');
  const [qty, setQty] = useState(1);
  const [showDetail, setShowDetail] = useState(false);
  const [priceOverride, setPriceOverride] = useState('');
  const [validated, setValidated] = useState(false);

  const selected = desserts.find(d => d.id === selectedId);
  const cost = selected ? calculateDessertCost(selected, ingredients, bases) : 0;
  const price = priceOverride ? parseFloat(priceOverride) : (selected?.sellPrice || 0);
  const margin = price - cost;
  const marginRate = price > 0 ? margin / price : 0;
  const coeff = cost > 0 ? price / cost : 0;

  // Resolved component lines for the detail view
  const lines = useMemo(() => {
    if (!selected) return [];
    return selected.components.map(comp => {
      const name = resolveComponentName(comp.type, comp.id, ingredients, bases);
      const unit = resolveComponentUnit(comp.type, comp.id, ingredients);
      let lineCost = 0;
      if (comp.type === 'ingredient') {
        const ing = findIngredient(ingredients, comp.id);
        if (ing) lineCost = ing.unit === 'u' ? ing.pricePerKg * comp.quantity : (ing.pricePerKg * comp.quantity) / 1000;
      } else {
        const base = findBase(bases, comp.id);
        if (base) lineCost = (calculateBaseCostPerKg(base, ingredients) * comp.quantity) / 1000;
      }
      return { name, type: comp.type, quantity: comp.quantity, unit, lineCost };
    });
  }, [selected, ingredients, bases]);

  const handleValidate = () => {
    if (!selected) return;
    onValidate(selected, qty, priceOverride ? parseFloat(priceOverride) : undefined);
    setValidated(true);
    showToast(`${qty}× ${selected.name} enregistré — +${fmt(margin * qty)} de marge`);
    setTimeout(() => {
      setQty(1);
      setPriceOverride('');
      setValidated(false);
      setShowDetail(false);
    }, 1500);
  };

  const marginColor = marginRate >= 0.6 ? 'text-emerald-400' : marginRate >= 0.4 ? 'text-amber-400' : 'text-red-400';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="h-full overflow-y-auto scrollbar-hide px-2 pb-32"
    >
      <PageHeader
        brand="Ventes"
        title="Nouvelle Vente"
        description="Sélectionnez un dessert, ajustez et validez pour enregistrer dans la compta."
      />

      <div className="px-4 space-y-5">
        {/* Dessert selector */}
        <SectionCard title="Dessert">
          <div className="relative">
            <select
              className="w-full p-5 bg-white border-2 border-gourmand-border rounded-2xl font-black italic text-lg focus:outline-none focus:border-gourmand-strawberry appearance-none cursor-pointer pr-12 shadow-sm"
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setPriceOverride(''); }}
            >
              {desserts.map(d => (
                <option key={d.id} value={d.id}>{d.emoji} {d.name}</option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gourmand-strawberry">
              <ChevronRight size={20} className="rotate-90" />
            </div>
          </div>
        </SectionCard>

        {/* Quantity + Price override */}
        <div className="grid grid-cols-2 gap-3">
          <SectionCard title="Quantité">
            <div className="flex items-center justify-between p-3">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-11 h-11 rounded-xl bg-gourmand-bg flex items-center justify-center font-bold text-xl active:scale-90 transition-transform">−</button>
              <span className="text-3xl font-black italic">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-11 h-11 rounded-xl bg-gourmand-bg flex items-center justify-center font-bold text-xl active:scale-90 transition-transform">+</button>
            </div>
          </SectionCard>

          <SectionCard title="Prix unitaire">
            <div className="p-3">
              <input
                type="number"
                step="0.5"
                placeholder={selected?.sellPrice.toString() || '0'}
                value={priceOverride}
                onChange={e => setPriceOverride(e.target.value)}
                className="w-full bg-transparent text-center text-3xl font-black italic outline-none placeholder:text-gourmand-cocoa/20"
              />
              <p className="text-[9px] text-center text-gourmand-cocoa/40 font-bold uppercase mt-1">
                {priceOverride ? 'Prix modifié' : 'Prix catalogue'}
              </p>
            </div>
          </SectionCard>
        </div>

        {/* Financial Summary */}
        {selected && (
          <div className="space-y-3">
            <div className="gourmand-card-dark p-6 relative overflow-hidden">
              <div className="absolute top-4 right-6 opacity-10"><TrendingUp size={56} /></div>

              <div className="flex justify-between items-end mb-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-40 mb-1">Total CA</p>
                  <p className="text-3xl font-black italic">{fmt(price * qty)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-40 mb-1">Marge brute</p>
                  <p className={`text-2xl font-black italic ${marginColor}`}>{fmt(margin * qty)}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="bg-white/5 p-2.5 rounded-xl">
                  <p className="text-[8px] font-black uppercase opacity-40">Coût unit.</p>
                  <p className="font-bold text-sm">{fmt(cost)}</p>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl">
                  <p className="text-[8px] font-black uppercase opacity-40">Marge unit.</p>
                  <p className="font-bold text-sm">{fmt(margin)}</p>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl">
                  <p className="text-[8px] font-black uppercase opacity-40">Taux</p>
                  <p className={`font-bold text-sm ${marginColor}`}>{(marginRate * 100).toFixed(0)}%</p>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl">
                  <p className="text-[8px] font-black uppercase opacity-40">Coeff</p>
                  <p className="font-bold text-sm">×{coeff.toFixed(1)}</p>
                </div>
              </div>
            </div>

            {/* Cost Detail Toggle */}
            <button
              onClick={() => setShowDetail(!showDetail)}
              className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gourmand-biscuit py-1"
            >
              {showDetail ? 'Masquer le détail' : 'Voir le détail du coût'}
              <ChevronRight size={14} className={`transition-transform ${showDetail ? 'rotate-90' : ''}`} />
            </button>

            <AnimatePresence>
              {showDetail && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-gourmand-bg rounded-2xl p-4 space-y-2">
                    {lines.map((line, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="font-bold text-gourmand-cocoa/70">
                          {line.type === 'base' ? '🍯' : '📦'} {line.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-gourmand-cocoa/40 font-medium text-xs">{line.quantity}{line.unit}</span>
                          <span className="font-black w-16 text-right">{fmt(line.lineCost)}</span>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-gourmand-border pt-2 mt-1 flex justify-between">
                      <span className="text-sm font-black text-gourmand-cocoa/60 uppercase">Total</span>
                      <span className="font-black text-gourmand-strawberry">{fmt(cost)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Validate Button */}
        <motion.button
          onClick={handleValidate}
          disabled={!selected || validated}
          animate={validated ? { scale: [1, 1.05, 1] } : {}}
          className={`w-full py-5 rounded-[24px] text-md uppercase tracking-widest italic font-black flex items-center justify-center gap-3 transition-all active:scale-[0.95] shadow-xl ${
            validated
              ? 'bg-emerald-600 text-white shadow-emerald-500/20'
              : 'bg-gourmand-strawberry text-white shadow-gourmand-strawberry/20'
          } disabled:opacity-50`}
        >
          {validated ? (
            <><Check size={20} strokeWidth={3} /> Enregistré !</>
          ) : (
            'Valider & Enregistrer'
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};
