import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { Base, RawIngredient } from '../types';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { fmt, findIngredient, calculateBaseCost, calculateBaseCostPerKg } from '../lib/calculations';

const CATEGORIES = ['Fond', 'Ganache', 'Insert', 'Coulis', 'Crème', 'Biscuit', 'Autre'];

interface Props {
  bases: Base[];
  ingredients: RawIngredient[];
  setBases: React.Dispatch<React.SetStateAction<Base[]>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const BasesScreen: React.FC<Props> = ({ bases, ingredients, setBases, showToast }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Base | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Base | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Fond');
  const [notes, setNotes] = useState('');
  const [compMap, setCompMap] = useState<Record<string, number>>({});

  const openAdd = () => {
    setEditItem(null);
    setName(''); setCategory('Fond'); setNotes('');
    setCompMap({});
    setShowForm(true);
  };

  const openEdit = (base: Base) => {
    setEditItem(base);
    setName(base.name);
    setCategory(base.category);
    setNotes(base.notes);
    const map: Record<string, number> = {};
    base.components.forEach(c => { map[c.ingredientId] = c.quantity; });
    setCompMap(map);
    setShowForm(true);
  };

  const save = () => {
    if (!name) return;
    const components = Object.entries(compMap)
      .filter(([, qty]) => qty > 0)
      .map(([ingredientId, quantity]) => ({ ingredientId, quantity }));
    if (components.length === 0) return;

    if (editItem) {
      setBases(prev => prev.map(b =>
        b.id === editItem.id ? { ...b, name, category, notes, components } : b
      ));
      showToast(`${name} mis à jour`);
    } else {
      const newBase: Base = {
        id: 'base-' + Date.now(),
        name, category, emoji: '🍯', notes,
        components,
        createdAt: new Date().toISOString(),
      };
      setBases(prev => [...prev, newBase]);
      showToast(`${name} créé`);
    }
    setShowForm(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setBases(prev => prev.filter(b => b.id !== deleteTarget.id));
    showToast(`${deleteTarget.name} supprimé`, 'info');
    setDeleteTarget(null);
    setExpandedId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="h-full overflow-y-auto scrollbar-hide px-2 pb-32"
    >
      <PageHeader
        title="Préparations"
        description={`${bases.length} base${bases.length > 1 ? 's' : ''} maison · Coûts recalculés en temps réel`}
        action={
          <button onClick={openAdd} className="w-10 h-10 rounded-2xl bg-gourmand-chocolate text-white flex items-center justify-center active:scale-95 shadow-lg">
            <Plus size={24} />
          </button>
        }
      />

      <div className="px-4 space-y-3">
        {bases.map(base => {
          const { totalCost, totalWeight } = calculateBaseCost(base, ingredients);
          const costPerKg = calculateBaseCostPerKg(base, ingredients);
          const isExpanded = expandedId === base.id;

          return (
            <div key={base.id} className="gourmand-card overflow-hidden">
              {/* Header — clickable */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : base.id)}
                className="w-full p-5 flex justify-between items-center active:bg-gourmand-bg/30 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gourmand-bg flex items-center justify-center text-2xl">{base.emoji}</div>
                  <div>
                    <p className="font-black italic text-lg leading-tight">{base.name}</p>
                    <p className="text-[10px] font-bold text-gourmand-cocoa/40 uppercase">
                      {base.category} · {base.components.length} ingrédient{base.components.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-black italic text-lg text-gourmand-strawberry">{fmt(costPerKg)}</p>
                    <p className="text-[9px] font-bold text-gourmand-cocoa/40 uppercase">/ kg</p>
                  </div>
                  <ChevronDown size={18} className={`text-gourmand-cocoa/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Detail — expanded */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-3">
                      {/* Components detail */}
                      <div className="bg-gourmand-bg rounded-2xl p-4 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gourmand-cocoa/40 mb-2">Composition</p>
                        {base.components.map((comp, idx) => {
                          const ing = findIngredient(ingredients, comp.ingredientId);
                          const ingName = ing?.name || 'Inconnu';
                          const ingUnit = ing?.unit === 'u' ? 'u' : ing?.unit === 'L' ? 'ml' : 'g';
                          let lineCost = 0;
                          if (ing) {
                            lineCost = ing.unit === 'u' ? ing.pricePerKg * comp.quantity : (ing.pricePerKg * comp.quantity) / 1000;
                          }
                          return (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <span className="font-bold text-gourmand-cocoa/80">{ingName}</span>
                              <div className="flex items-center gap-4">
                                <span className="text-gourmand-cocoa/40 font-medium">{comp.quantity}{ingUnit}</span>
                                <span className="font-black text-gourmand-chocolate w-16 text-right">{fmt(lineCost)}</span>
                              </div>
                            </div>
                          );
                        })}
                        <div className="border-t border-gourmand-border pt-2 mt-2 flex justify-between items-center">
                          <span className="text-sm font-black uppercase text-gourmand-cocoa/60">Total</span>
                          <div className="flex items-center gap-4">
                            <span className="text-gourmand-cocoa/40 font-medium text-sm">{totalWeight}g</span>
                            <span className="font-black text-gourmand-strawberry w-16 text-right">{fmt(totalCost)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {base.notes && (
                        <p className="text-xs text-gourmand-cocoa/40 italic px-1">{base.notes}</p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(base)}
                          className="flex-1 gourmand-btn-primary py-3 text-xs"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => setDeleteTarget(base)}
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

        {bases.length === 0 && (
          <div className="text-center py-16 opacity-30">
            <p className="text-4xl mb-3">🍯</p>
            <p className="font-bold text-sm">Aucune préparation</p>
            <p className="text-xs mt-1">Commencez par créer vos bases</p>
          </div>
        )}
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showForm && (
          <Modal onClose={() => setShowForm(false)} title={editItem ? 'Modifier la base' : 'Nouvelle Préparation'}>
            <div className="p-5 space-y-5">
              <input
                placeholder="Nom de la préparation"
                className="gourmand-input w-full"
                value={name}
                onChange={e => setName(e.target.value)}
              />

              <select className="gourmand-input w-full" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gourmand-cocoa/40">Composition (g / ml / unités)</p>
                <div className="max-h-52 overflow-y-auto scrollbar-hide space-y-2">
                  {ingredients.map(ing => {
                    const val = compMap[ing.id] || 0;
                    const ingUnit = ing.unit === 'u' ? 'u' : ing.unit === 'L' ? 'ml' : 'g';
                    return (
                      <div key={ing.id} className="flex items-center justify-between p-3 bg-gourmand-bg rounded-xl">
                        <span className="text-sm font-bold flex items-center gap-2">
                          <span>{ing.emoji}</span> {ing.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            placeholder="0"
                            value={val || ''}
                            className="w-16 bg-white border border-gourmand-border rounded-lg text-right p-1.5 text-sm font-black"
                            onChange={e => {
                              const qty = parseFloat(e.target.value) || 0;
                              setCompMap(prev => ({ ...prev, [ing.id]: qty }));
                            }}
                          />
                          <span className="text-[10px] font-bold text-gourmand-cocoa/40 w-5">{ingUnit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <textarea
                placeholder="Notes (optionnel)"
                className="gourmand-input w-full resize-none h-16"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />

              <button onClick={save} className="gourmand-btn-primary w-full py-4 text-sm">
                {editItem ? 'Enregistrer' : 'Créer la préparation'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDialog
            title="Supprimer la base"
            message={`"${deleteTarget.name}" sera supprimée. Les desserts qui l'utilisent ne pourront plus calculer leur coût.`}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
