import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, ChevronDown, Timer, TrendingUp } from 'lucide-react';
import { Dessert, RawIngredient, Base } from '../types';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { fmt, calculateDessertCost, resolveComponentName, resolveComponentUnit, findIngredient, calculateBaseCostPerKg, findBase } from '../lib/calculations';

interface Props {
  desserts: Dessert[];
  ingredients: RawIngredient[];
  bases: Base[];
  setDesserts: React.Dispatch<React.SetStateAction<Dessert[]>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DessertsScreen: React.FC<Props> = ({ desserts, ingredients, bases, setDesserts, showToast }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Dessert | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Dessert | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [servings, setServings] = useState('8');
  const [notes, setNotes] = useState('');
  const [compMap, setCompMap] = useState<Record<string, { type: 'ingredient' | 'base'; qty: number }>>({});

  const openAdd = () => {
    setEditItem(null);
    setName(''); setSellPrice(''); setServings('8'); setNotes('');
    setCompMap({});
    setShowForm(true);
  };

  const openEdit = (d: Dessert) => {
    setEditItem(d);
    setName(d.name);
    setSellPrice(d.sellPrice.toString());
    setServings(d.servings.toString());
    setNotes(d.notes);
    const map: Record<string, { type: 'ingredient' | 'base'; qty: number }> = {};
    d.components.forEach(c => { map[c.id] = { type: c.type, qty: c.quantity }; });
    setCompMap(map);
    setShowForm(true);
  };

  const save = () => {
    if (!name) return;
    const components = Object.entries(compMap)
      .filter(([, v]) => v.qty > 0)
      .map(([id, v]) => ({ type: v.type, id, quantity: v.qty }));
    if (components.length === 0) return;

    if (editItem) {
      setDesserts(prev => prev.map(d =>
        d.id === editItem.id ? {
          ...d, name, sellPrice: parseFloat(sellPrice) || 0,
          servings: parseInt(servings) || 1, notes, components,
        } : d
      ));
      showToast(`${name} mis à jour`);
    } else {
      const newDessert: Dessert = {
        id: 'dessert-' + Date.now(),
        name, emoji: '🍰',
        sellPrice: parseFloat(sellPrice) || 0,
        servings: parseInt(servings) || 1,
        notes, components,
        createdAt: new Date().toISOString(),
      };
      setDesserts(prev => [...prev, newDessert]);
      showToast(`${name} créé`);
    }
    setShowForm(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setDesserts(prev => prev.filter(d => d.id !== deleteTarget.id));
    showToast(`${deleteTarget.name} supprimé`, 'info');
    setDeleteTarget(null);
    setExpandedId(null);
  };

  const marginColor = (rate: number) => {
    if (rate >= 0.6) return 'text-emerald-600';
    if (rate >= 0.4) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.02 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="h-full overflow-y-auto scrollbar-hide px-2 pb-32"
    >
      <PageHeader
        title="Catalogue"
        description={`${desserts.length} fiche${desserts.length > 1 ? 's' : ''} technique${desserts.length > 1 ? 's' : ''} · Marges en temps réel`}
        action={
          <button onClick={openAdd} className="w-10 h-10 rounded-2xl bg-gourmand-chocolate text-white flex items-center justify-center active:scale-95 shadow-lg">
            <Plus size={24} />
          </button>
        }
      />

      <div className="px-4 space-y-3">
        {desserts.map(d => {
          const cost = calculateDessertCost(d, ingredients, bases);
          const margin = d.sellPrice - cost;
          const marginRate = d.sellPrice > 0 ? margin / d.sellPrice : 0;
          const coeff = cost > 0 ? d.sellPrice / cost : 0;
          const costPerServing = d.servings > 0 ? cost / d.servings : 0;
          const isExpanded = expandedId === d.id;

          return (
            <div key={d.id} className="gourmand-card overflow-hidden">
              {/* Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : d.id)}
                className="w-full p-5 flex justify-between items-center active:bg-gourmand-bg/30 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{d.emoji}</span>
                  <div>
                    <p className="font-black italic text-lg leading-tight">{d.name}</p>
                    <p className="text-[10px] font-bold text-gourmand-cocoa/40 uppercase">
                      {d.servings} parts · Coeff ×{coeff.toFixed(1)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-black italic text-lg">{fmt(d.sellPrice)}</p>
                    <p className={`text-[10px] font-black uppercase ${marginColor(marginRate)}`}>
                      {(marginRate * 100).toFixed(0)}% marge
                    </p>
                  </div>
                  <ChevronDown size={18} className={`text-gourmand-cocoa/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Detail */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-4">
                      {/* KPIs */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-gourmand-bg rounded-xl p-3 text-center">
                          <p className="text-[9px] font-black uppercase text-gourmand-cocoa/40">Coût</p>
                          <p className="font-black text-gourmand-strawberry">{fmt(cost)}</p>
                        </div>
                        <div className="bg-gourmand-bg rounded-xl p-3 text-center">
                          <p className="text-[9px] font-black uppercase text-gourmand-cocoa/40">Marge</p>
                          <p className={`font-black ${marginColor(marginRate)}`}>{fmt(margin)}</p>
                        </div>
                        <div className="bg-gourmand-bg rounded-xl p-3 text-center">
                          <p className="text-[9px] font-black uppercase text-gourmand-cocoa/40">/ Part</p>
                          <p className="font-black">{fmt(costPerServing)}</p>
                        </div>
                      </div>

                      {/* Composition */}
                      <div className="bg-gourmand-bg rounded-2xl p-4 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gourmand-cocoa/40 mb-2">Composition</p>
                        {d.components.map((comp, idx) => {
                          const cName = resolveComponentName(comp.type, comp.id, ingredients, bases);
                          const cUnit = resolveComponentUnit(comp.type, comp.id, ingredients);
                          let lineCost = 0;
                          if (comp.type === 'ingredient') {
                            const ing = findIngredient(ingredients, comp.id);
                            if (ing) lineCost = ing.unit === 'u' ? ing.pricePerKg * comp.quantity : (ing.pricePerKg * comp.quantity) / 1000;
                          } else {
                            const base = findBase(bases, comp.id);
                            if (base) lineCost = (calculateBaseCostPerKg(base, ingredients) * comp.quantity) / 1000;
                          }
                          return (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <span className="font-bold text-gourmand-cocoa/80 flex items-center gap-2">
                                {comp.type === 'base' && <Timer size={12} className="text-gourmand-strawberry" />}
                                {cName}
                              </span>
                              <div className="flex items-center gap-4">
                                <span className="text-gourmand-cocoa/40 font-medium">{comp.quantity}{cUnit}</span>
                                <span className="font-black text-gourmand-chocolate w-16 text-right">{fmt(lineCost)}</span>
                              </div>
                            </div>
                          );
                        })}
                        <div className="border-t border-gourmand-border pt-2 mt-2 flex justify-between">
                          <span className="text-sm font-black uppercase text-gourmand-cocoa/60">Coût total</span>
                          <span className="font-black text-gourmand-strawberry">{fmt(cost)}</span>
                        </div>
                      </div>

                      {d.notes && <p className="text-xs text-gourmand-cocoa/40 italic px-1">{d.notes}</p>}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(d)} className="flex-1 gourmand-btn-primary py-3 text-xs">
                          Modifier
                        </button>
                        <button
                          onClick={() => setDeleteTarget(d)}
                          className="w-12 h-12 rounded-2xl border-2 border-red-200 text-red-400 flex items-center justify-center active:scale-95"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {desserts.length === 0 && (
          <div className="text-center py-16 opacity-30">
            <p className="text-4xl mb-3">🍰</p>
            <p className="font-bold text-sm">Aucun dessert</p>
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <Modal onClose={() => setShowForm(false)} title={editItem ? 'Modifier le dessert' : 'Nouveau Dessert'}>
            <div className="p-5 space-y-5">
              <input placeholder="Nom du dessert" className="gourmand-input w-full" value={name} onChange={e => setName(e.target.value)} />

              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gourmand-cocoa/40 mb-1">Prix de vente (€)</p>
                  <input type="number" step="0.5" className="gourmand-input w-full" value={sellPrice} onChange={e => setSellPrice(e.target.value)} />
                </div>
                <div className="w-24">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gourmand-cocoa/40 mb-1">Parts</p>
                  <input type="number" className="gourmand-input w-full" value={servings} onChange={e => setServings(e.target.value)} />
                </div>
              </div>

              {/* Bases */}
              {bases.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gourmand-strawberry/60">Bases maison (g)</p>
                  {bases.map(b => {
                    const val = compMap[b.id]?.qty || 0;
                    return (
                      <div key={b.id} className="flex items-center justify-between p-3 bg-gourmand-strawberry/5 rounded-xl border border-gourmand-strawberry/10">
                        <span className="text-sm font-bold flex items-center gap-2"><Timer size={14} className="text-gourmand-strawberry" />{b.name}</span>
                        <input type="number" placeholder="0" value={val || ''}
                          className="w-16 bg-white border border-gourmand-border rounded-lg text-right p-1.5 text-sm font-black"
                          onChange={e => {
                            const qty = parseFloat(e.target.value) || 0;
                            setCompMap(prev => ({ ...prev, [b.id]: { type: 'base', qty } }));
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Ingredients */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gourmand-cocoa/40">Ingrédients directs (g/ml/u)</p>
                <div className="max-h-40 overflow-y-auto scrollbar-hide space-y-2">
                  {ingredients.map(i => {
                    const val = compMap[i.id]?.qty || 0;
                    const iUnit = i.unit === 'u' ? 'u' : i.unit === 'L' ? 'ml' : 'g';
                    return (
                      <div key={i.id} className="flex items-center justify-between p-3 bg-gourmand-bg rounded-xl">
                        <span className="text-sm font-bold">{i.emoji} {i.name}</span>
                        <div className="flex items-center gap-1">
                          <input type="number" placeholder="0" value={val || ''}
                            className="w-16 bg-white border border-gourmand-border rounded-lg text-right p-1.5 text-sm font-black"
                            onChange={e => {
                              const qty = parseFloat(e.target.value) || 0;
                              setCompMap(prev => ({ ...prev, [i.id]: { type: 'ingredient', qty } }));
                            }}
                          />
                          <span className="text-[10px] font-bold text-gourmand-cocoa/40 w-5">{iUnit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <textarea placeholder="Notes (optionnel)" className="gourmand-input w-full resize-none h-16" value={notes} onChange={e => setNotes(e.target.value)} />

              <button onClick={save} className="gourmand-btn-primary w-full py-4 text-sm italic font-black">
                {editItem ? 'Enregistrer' : 'Créer le dessert'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDialog
            title="Supprimer le dessert"
            message={`"${deleteTarget.name}" sera supprimé du catalogue.`}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
