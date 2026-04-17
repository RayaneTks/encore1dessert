import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, ChevronDown, Beaker, Apple, ChefHat } from 'lucide-react';
import { Dessert, RawIngredient, Base } from '../types';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { fmt, calculateDessertCost, resolveComponentName, resolveComponentUnit, findIngredient, calculateBaseCostPerKg, findBase } from '../lib/calculations';

interface Props {
  desserts: Dessert[];
  ingredients: RawIngredient[];
  bases: Base[];
  onSave: (dessert: Dessert) => Promise<Dessert | null>;
  onDelete: (id: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DessertsScreen: React.FC<Props> = ({ desserts, ingredients, bases, onSave, onDelete, showToast }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Dessert | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Dessert | null>(null);
  const [saving, setSaving] = useState(false);

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

  const save = async () => {
    if (!name) return;
    const components = Object.entries(compMap)
      .filter(([, v]) => v.qty > 0)
      .map(([id, v]) => ({ type: v.type, id, quantity: v.qty }));
    if (components.length === 0) return;

    setSaving(true);
    const dessert: Dessert = {
      id: editItem?.id || 'dessert-' + Date.now(),
      name, emoji: '🍰',
      sellPrice: parseFloat(sellPrice) || 0,
      servings: parseInt(servings) || 1,
      notes, components,
      createdAt: editItem?.createdAt || new Date().toISOString(),
    };

    const result = await onSave(dessert);
    setSaving(false);

    if (result) {
      showToast(editItem ? `${name} mis à jour` : `${name} créé`);
      setShowForm(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await onDelete(deleteTarget.id);
    showToast(`${deleteTarget.name} supprimé`, 'info');
    setDeleteTarget(null);
    setExpandedId(null);
  };

  const marginColor = (rate: number) => {
    if (rate >= 0.6) return 'text-emerald-600';
    if (rate >= 0.4) return 'text-amber-500';
    return 'text-red-500';
  };

  const liveCost = useMemo(() => {
    let cost = 0;
    Object.entries(compMap).forEach(([id, c]) => {
       if (c.type === 'ingredient') {
          const ing = findIngredient(ingredients, id);
          if (ing) cost += ing.unit === 'u' ? (ing.pricePerKg * c.qty) : (ing.pricePerKg * c.qty / 1000);
       } else {
          const base = findBase(bases, id);
          if (base) cost += (calculateBaseCostPerKg(base, ingredients) * c.qty / 1000);
       }
    });
    return cost;
  }, [compMap, ingredients, bases]);
  
  const livePrice = parseFloat(sellPrice) || 0;
  const liveMargin = livePrice - liveCost;
  const liveMarginRate = livePrice > 0 ? liveMargin / livePrice : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full overflow-y-auto scrollbar-hide px-2 pb-32"
    >
      <PageHeader
        title="Créations"
        description={`${desserts.length} recette${desserts.length > 1 ? 's' : ''} disponibles.`}
        action={
          <button onClick={openAdd} className="w-10 h-10 rounded-xl bg-gourmand-chocolate text-white flex items-center justify-center active:scale-95 shadow-sm transition-transform">
            <Plus size={22} />
          </button>
        }
      />

      <div className="px-4 space-y-4">
        {desserts.map(d => {
          const cost = calculateDessertCost(d, ingredients, bases);
          const margin = d.sellPrice - cost;
          const marginRate = d.sellPrice > 0 ? margin / d.sellPrice : 0;
          const coeff = cost > 0 ? d.sellPrice / cost : 0;
          const costPerServing = d.servings > 0 ? cost / d.servings : 0;
          const isExpanded = expandedId === d.id;

          return (
            <div key={d.id} className="gourmand-card overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : d.id)}
                className="w-full p-4 flex justify-between items-center hover:bg-gourmand-bg/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{d.emoji}</span>
                  <div>
                    <p className="font-semibold text-base text-gourmand-chocolate">{d.name}</p>
                    <p className="text-[11px] font-medium text-gourmand-biscuit flex items-center gap-1.5 mt-0.5">
                      {d.servings} parts <span className="w-1 h-1 rounded-full bg-gourmand-border" /> Coeff ×{coeff.toFixed(1)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-base">{fmt(d.sellPrice)}</p>
                    <p className={`text-[10px] font-semibold mt-0.5 ${marginColor(marginRate)}`}>
                      {(marginRate * 100).toFixed(0)}%
                    </p>
                  </div>
                  <ChevronDown size={18} className={`text-gourmand-biscuit transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-4 border-t border-gourmand-border pt-3 mt-1">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-gourmand-bg rounded-xl p-3 text-center">
                          <p className="text-[10px] font-semibold text-gourmand-biscuit mb-0.5">Coût unitaire</p>
                          <p className="font-bold text-sm">{fmt(cost)}</p>
                        </div>
                        <div className="bg-gourmand-bg rounded-xl p-3 text-center">
                          <p className="text-[10px] font-semibold text-gourmand-biscuit mb-0.5">Marge brute</p>
                          <p className={`font-bold text-sm ${marginColor(marginRate)}`}>{fmt(margin)}</p>
                        </div>
                        <div className="bg-gourmand-bg rounded-xl p-3 text-center">
                          <p className="text-[10px] font-semibold text-gourmand-biscuit mb-0.5">Coût / Part</p>
                          <p className="font-bold text-sm">{fmt(costPerServing)}</p>
                        </div>
                      </div>

                      <div className="bg-gourmand-bg rounded-xl p-4">
                        <p className="text-[10px] font-semibold text-gourmand-biscuit uppercase tracking-wide mb-3">Composition technique</p>
                        <div className="space-y-2.5">
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
                                <span className="font-medium text-gourmand-chocolate flex items-center gap-2">
                                  {comp.type === 'base' ? <Beaker size={14} className="text-gourmand-biscuit" /> : <Apple size={14} className="text-gourmand-biscuit" />}
                                  {cName}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="text-gourmand-biscuit text-xs">{comp.quantity}{cUnit}</span>
                                  <span className="font-semibold text-gourmand-chocolate w-16 text-right">{fmt(lineCost)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="border-t border-gourmand-border/60 pt-2.5 mt-3 flex justify-between items-center">
                          <span className="text-xs font-semibold text-gourmand-cocoa">COÛT TOTAL</span>
                          <span className="font-bold">{fmt(cost)}</span>
                        </div>
                      </div>

                      {d.notes && <p className="text-xs text-gourmand-cocoa bg-gourmand-bg/50 p-3 rounded-xl">{d.notes}</p>}

                      <div className="flex gap-2 pt-1">
                        <button onClick={() => openEdit(d)} className="flex-1 gourmand-btn-primary py-3">Modifier</button>
                        <button onClick={() => setDeleteTarget(d)} className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
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
          <div className="text-center py-16 opacity-50">
            <div className="w-16 h-16 rounded-full bg-gourmand-border/50 flex items-center justify-center mx-auto mb-3">
              <ChefHat size={32} className="text-gourmand-cocoa" />
            </div>
            <p className="font-medium">Aucune recette</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <Modal onClose={() => setShowForm(false)} title={editItem ? 'Éditer' : 'Nouvelle Recette'}>
            <div className="flex flex-col h-[70vh]">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32 scrollbar-hide">
                <div className="space-y-4">
                  <input placeholder="Nom du produit" className="gourmand-input w-full text-base" value={name} onChange={e => setName(e.target.value)} />
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold text-gourmand-biscuit mb-1.5 ml-1">Prix de vente (€)</p>
                      <input type="number" step="0.5" className="gourmand-input w-full" value={sellPrice} onChange={e => setSellPrice(e.target.value)} />
                    </div>
                    <div className="w-24">
                      <p className="text-[11px] font-semibold text-gourmand-biscuit mb-1.5 ml-1">Parts</p>
                      <input type="number" className="gourmand-input w-full" value={servings} onChange={e => setServings(e.target.value)} />
                    </div>
                  </div>
                </div>

                {bases.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-gourmand-biscuit uppercase tracking-wide mb-3 flex items-center gap-2"><Beaker size={14} /> Bases maison (g)</h4>
                    <div className="space-y-2">
                      {bases.map(b => (
                        <div key={b.id} className="flex items-center justify-between p-3 bg-gourmand-bg rounded-xl">
                          <span className="text-sm font-medium">{b.name}</span>
                          <input type="number" placeholder="0" value={compMap[b.id]?.qty || ''}
                            className="w-20 bg-white border border-gourmand-border rounded-lg text-right px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-gourmand-chocolate"
                            onChange={e => setCompMap(prev => ({ ...prev, [b.id]: { type: 'base', qty: parseFloat(e.target.value) || 0 } }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-[11px] font-semibold text-gourmand-biscuit uppercase tracking-wide mb-3 flex items-center gap-2"><Apple size={14} /> Matières premières</h4>
                  <div className="space-y-2">
                    {ingredients.map(i => {
                      const iUnit = i.unit === 'u' ? 'u' : i.unit === 'L' ? 'ml' : 'g';
                      return (
                        <div key={i.id} className="flex items-center justify-between p-3 bg-gourmand-bg rounded-xl">
                          <span className="text-sm font-medium">{i.name}</span>
                          <div className="flex items-center gap-2">
                            <input type="number" placeholder="0" value={compMap[i.id]?.qty || ''}
                              className="w-20 bg-white border border-gourmand-border rounded-lg text-right px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-gourmand-chocolate"
                              onChange={e => setCompMap(prev => ({ ...prev, [i.id]: { type: 'ingredient', qty: parseFloat(e.target.value) || 0 } }))}
                            />
                            <span className="text-xs font-medium text-gourmand-biscuit w-4">{iUnit}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <textarea placeholder="Notes techniques..." className="gourmand-input w-full resize-none h-24 text-sm" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <div className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gourmand-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-b-3xl">
                <div className="flex justify-between items-center mb-3 px-2">
                   <div>
                     <p className="text-[10px] text-gourmand-biscuit font-semibold uppercase">Coût direct</p>
                     <p className="text-base font-bold">{fmt(liveCost)}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] text-gourmand-biscuit font-semibold uppercase">Marge estimée</p>
                     <p className={`text-base font-bold ${marginColor(liveMarginRate)}`}>{livePrice > 0 ? `${fmt(liveMargin)} (${(liveMarginRate * 100).toFixed(0)}%)` : '-'}</p>
                   </div>
                </div>
                <button onClick={save} disabled={saving} className="gourmand-btn-primary w-full py-3.5 text-sm disabled:opacity-50">
                  {saving ? 'Enregistrement...' : editItem ? 'Mettre à jour' : 'Enregistrer la recette'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDialog title="Supprimer" message={`Désirez-vous supprimer "${deleteTarget.name}" ?`} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
