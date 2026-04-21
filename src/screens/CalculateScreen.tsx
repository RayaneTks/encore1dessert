import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, TrendingUp, Check, Calculator, Clock } from 'lucide-react';
import { Dessert, RawIngredient, Base, Commande, Tab } from '../types';
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
  commandes: Commande[];
  setActiveTab: (tab: Tab) => void;
  targetMargin: number;
  onValidate: (dessert: Dessert, quantity: number, overridePrice?: number) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CalculateScreen: React.FC<Props> = ({ desserts, ingredients, bases, commandes, setActiveTab, targetMargin, onValidate, showToast }) => {
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
  const suggestedPrice = cost > 0 && targetMargin < 1 ? cost / (1 - targetMargin) : null;

  const todayISO = new Date().toISOString().split('T')[0];
  const todayCommandes = commandes.filter(c => c.deliveryDate === todayISO && c.status !== 'delivered');

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
    showToast(`${qty}× ${selected.name} enregistré pour la compta.`);
    setTimeout(() => {
      setQty(1);
      setPriceOverride('');
      setValidated(false);
      setShowDetail(false);
    }, 2000);
  };

  const marginColor = marginRate >= 0.6 ? 'text-emerald-400' : marginRate >= 0.4 ? 'text-amber-400' : 'text-red-400';

  if (desserts.length === 0) {
     return (
       <div className="h-full px-4 flex flex-col items-center justify-center opacity-50 pb-32">
          <div className="w-16 h-16 rounded-full bg-gourmand-border/50 flex items-center justify-center mx-auto mb-4">
             <Calculator size={32} className="text-gourmand-cocoa" />
          </div>
          <p className="font-semibold text-lg text-gourmand-chocolate mb-1">Caisse vide</p>
          <p className="text-sm font-medium text-gourmand-biscuit text-center">Créez d'abord des recettes pour pouvoir encaisser et calculer.</p>
       </div>
     );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      className="h-full overflow-y-auto scrollbar-hide px-2 pb-32"
    >
      <PageHeader
        title="Point de Vente"
        description="Sélectionnez un produit et enregistrez la vente."
      />

      <div className="px-4 space-y-4">
        {/* Banner commandes du jour */}
        <AnimatePresence>
          {todayCommandes.length > 0 && (
            <motion.button
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onClick={() => setActiveTab('commandes')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-left overflow-hidden"
            >
              <Clock size={14} className="text-amber-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-amber-700">
                  {todayCommandes.length} commande{todayCommandes.length > 1 ? 's' : ''} à livrer aujourd'hui
                </p>
                <p className="text-[10px] text-amber-600/80 truncate">
                  {todayCommandes.map(c => c.clientName).join(', ')}
                </p>
              </div>
              <ChevronRight size={14} className="text-amber-500 flex-shrink-0" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Dessert selector */}
        <SectionCard title="Produit à encaisser">
          <div className="relative">
            <select
              className="w-full px-4 py-3 bg-white border border-gourmand-border rounded-xl font-semibold text-base focus:outline-none focus:border-gourmand-chocolate appearance-none cursor-pointer pr-12 shadow-sm text-gourmand-chocolate"
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setPriceOverride(''); }}
            >
              {desserts.map(d => (
                <option key={d.id} value={d.id}>{d.emoji} {d.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gourmand-biscuit">
              <ChevronRight size={20} className="rotate-90" />
            </div>
          </div>
        </SectionCard>

        {/* Quantity + Price override */}
        <div className="grid grid-cols-2 gap-3 items-start mt-2">
          <SectionCard title="Quantité">
            <div className="flex items-center justify-between">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-11 h-11 rounded-lg bg-gourmand-bg flex items-center justify-center font-medium text-2xl active:scale-95 transition-transform text-gourmand-chocolate">−</button>
              <span className="text-3xl font-bold tracking-tight text-gourmand-chocolate">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-11 h-11 rounded-lg bg-gourmand-bg flex items-center justify-center font-medium text-2xl active:scale-95 transition-transform text-gourmand-chocolate">+</button>
            </div>
          </SectionCard>

          <SectionCard title="Prix Unitaire (€)">
            <input
              type="number"
              step="0.5"
              placeholder={selected?.sellPrice.toString() || '0'}
              value={priceOverride}
              onChange={e => setPriceOverride(e.target.value)}
              className="w-full bg-transparent text-center text-3xl font-bold tracking-tight outline-none placeholder:text-gourmand-border text-gourmand-chocolate"
            />
            <p className="text-[9px] text-center text-gourmand-biscuit font-semibold uppercase tracking-widest mt-1">
              {priceOverride ? 'Prix personnalisé' : 'Prix catalogue'}
            </p>
            {suggestedPrice !== null && (
              <button
                onClick={() => setPriceOverride(suggestedPrice.toFixed(2))}
                className="mt-3 w-full text-[10px] font-bold text-gourmand-chocolate/70 bg-gourmand-bg rounded-xl py-2 px-3 text-center active:bg-gourmand-border transition-colors"
              >
                Suggéré {Math.round(targetMargin * 100)}% → {fmt(suggestedPrice)}
              </button>
            )}
          </SectionCard>
        </div>

        {/* Financial Summary */}
        {selected && (
          <div className="space-y-3">
            <div className="gourmand-card-dark p-4 relative overflow-hidden shadow-lg shadow-gourmand-chocolate/10">
              <div className="absolute top-4 right-6 opacity-5"><TrendingUp size={56} /></div>

              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-1">Chiffre d'Affaire</p>
                  <p className="text-3xl font-bold tracking-tight">{fmt(price * qty)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-1">Marge Brute</p>
                  <p className={`text-2xl font-bold tracking-tight ${marginColor}`}>{fmt(margin * qty)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/10 p-3 rounded-xl">
                  <p className="text-[9px] font-semibold uppercase tracking-widest opacity-60 mb-1">Coût unitaire</p>
                  <p className="font-semibold text-sm">{fmt(cost)}</p>
                </div>
                <div className="bg-white/10 p-3 rounded-xl">
                  <p className="text-[9px] font-semibold uppercase tracking-widest opacity-60 mb-1">Marge unit.</p>
                  <p className="font-semibold text-sm">{fmt(margin)}</p>
                </div>
                <div className="bg-white/10 p-3 rounded-xl">
                  <p className="text-[9px] font-semibold uppercase tracking-widest opacity-60 mb-1">Taux</p>
                  <p className={`font-semibold text-sm ${marginColor}`}>{(marginRate * 100).toFixed(0)}%</p>
                </div>
                <div className="bg-white/10 p-3 rounded-xl">
                  <p className="text-[9px] font-semibold uppercase tracking-widest opacity-60 mb-1">Coeff</p>
                  <p className="font-semibold text-sm">×{coeff.toFixed(1)}</p>
                </div>
              </div>
            </div>

            {/* Cost Detail Toggle */}
            <button
              onClick={() => setShowDetail(!showDetail)}
              className="w-full flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit py-2"
            >
              {showDetail ? 'Masquer la composition' : 'Voir la composition'}
              <ChevronRight size={14} className={`transition-transform duration-300 ${showDetail ? 'rotate-90' : ''}`} />
            </button>

            <AnimatePresence>
              {showDetail && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-gourmand-bg border border-gourmand-border rounded-xl p-4 space-y-2 mt-1">
                    {lines.map((line, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="font-medium text-gourmand-chocolate">
                          {line.type === 'base' ? '🍯' : '🍎'} {line.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-gourmand-biscuit text-xs">{line.quantity}{line.unit}</span>
                          <span className="font-semibold w-16 text-right text-gourmand-chocolate">{fmt(line.lineCost)}</span>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-gourmand-border pt-2.5 mt-2 flex justify-between">
                      <span className="text-xs font-semibold text-gourmand-cocoa uppercase tracking-wide">Coût Technique Total</span>
                      <span className="font-bold text-gourmand-chocolate">{fmt(cost)}</span>
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
          className={`w-full py-4 rounded-xl text-sm uppercase tracking-widest font-bold flex items-center justify-center gap-3 transition-colors active:scale-[0.98] mt-2 ${
            validated
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-gourmand-chocolate text-white shadow-lg shadow-gourmand-chocolate/10 hover:bg-black'
          } disabled:opacity-50`}
        >
          {validated ? (
            <><Check size={20} strokeWidth={3} /> Enregistré</>
          ) : (
            'Encaisser'
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};
