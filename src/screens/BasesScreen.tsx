import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, ChevronDown, Beaker, Apple } from 'lucide-react';
import { Base, RawIngredient } from '../types';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { IconActionButton } from '../components/IconActionButton';
import { FormLabel } from '../components/FormLabel';
import { fmt, findIngredient, calculateBaseCost, calculateBaseCostPerKg } from '../lib/calculations';

const CATEGORIES = ['Fond', 'Ganache', 'Insert', 'Coulis', 'Crème', 'Biscuit', 'Autre'];

interface Props {
  bases: Base[];
  ingredients: RawIngredient[];
  onSave: (base: Base) => Promise<Base | null>;
  onDelete: (id: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const BasesScreen: React.FC<Props> = ({ bases, ingredients, onSave, onDelete, showToast }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Base | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Base | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍯');
  const [category, setCategory] = useState('Fond');
  const [notes, setNotes] = useState('');
  const [compMap, setCompMap] = useState<Record<string, number>>({});

  const openAdd = () => {
    setEditItem(null);
    setName(''); setEmoji('🍯'); setCategory('Fond'); setNotes('');
    setCompMap({});
    setShowForm(true);
  };

  const openEdit = (base: Base) => {
    setEditItem(base);
    setName(base.name);
    setEmoji(base.emoji);
    setCategory(base.category);
    setNotes(base.notes);
    const map: Record<string, number> = {};
    base.components.forEach(c => { map[c.ingredientId] = c.quantity; });
    setCompMap(map);
    setShowForm(true);
  };

  const save = async () => {
    if (!name.trim()) { showToast('Veuillez saisir un nom', 'error'); return; }
    const components = Object.entries(compMap)
      .filter(([, qty]) => qty > 0)
      .map(([ingredientId, quantity]) => ({ ingredientId, quantity }));
    if (components.length === 0) { showToast('Veuillez ajouter au moins un composant', 'error'); return; }
    if (!emoji.trim()) { showToast('Icône requise', 'error'); return; }

    setSaving(true);
    const base: Base = {
      id: editItem?.id || 'base-' + Date.now(),
      name, category, emoji, notes, components,
      createdAt: editItem?.createdAt || new Date().toISOString(),
    };
    const result = await onSave(base);
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full overflow-y-auto scrollbar-hide px-2 pb-32"
    >
      <PageHeader
        title="Préparations"
        description={`${bases.length} base${bases.length > 1 ? 's' : ''} maison`}
        action={
          <IconActionButton
            onClick={openAdd}
            icon={<Plus size={22} />}
            label="Ajouter une base"
            disabled={ingredients.length === 0}
          />
        }
      />

      {ingredients.length === 0 && (
        <div className="px-4 mb-4">
          <div className="bg-amber-50 text-amber-700 border border-amber-200/50 p-4 rounded-xl text-sm font-medium">
            💡 Ajoutez d'abord des matières premières pour pouvoir créer une base.
          </div>
        </div>
      )}

      <div className="px-4 space-y-4">
        {bases.map(base => {
          const { totalCost, totalWeight } = calculateBaseCost(base, ingredients);
          const costPerKg = calculateBaseCostPerKg(base, ingredients);
          const isExpanded = expandedId === base.id;

          return (
            <div key={base.id} className="gourmand-card overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : base.id)}
                className="w-full p-4 flex justify-between items-center hover:bg-gourmand-bg/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gourmand-bg flex items-center justify-center text-2xl border border-gourmand-border/50">{base.emoji}</div>
                  <div>
                    <p className="font-semibold text-base text-gourmand-chocolate">{base.name}</p>
                    <p className="text-xs font-medium text-gourmand-biscuit uppercase mt-1 tracking-wide">
                      {base.category} · {base.components.length} composant{base.components.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-base">{fmt(costPerKg)}</p>
                    <p className="text-[10px] font-medium text-gourmand-biscuit uppercase">/kg</p>
                  </div>
                  <ChevronDown size={18} className={`text-gourmand-biscuit transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-4 pt-3 border-t border-gourmand-border">
                      <div className="bg-gourmand-bg rounded-xl p-4 space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-3">Composition</p>
                        {base.components.map((comp, idx) => {
                          const ing = findIngredient(ingredients, comp.ingredientId);
                          const ingName = ing?.name || 'Inconnu';
                          const ingUnit = ing?.unit === 'u' ? 'u' : ing?.unit === 'L' ? 'ml' : 'g';
                          let lineCost = 0;
                          if (ing) lineCost = ing.unit === 'u' ? ing.pricePerKg * comp.quantity : (ing.pricePerKg * comp.quantity) / 1000;
                          return (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <span className="font-medium">{ingName}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-gourmand-biscuit text-xs">{comp.quantity}{ingUnit}</span>
                                <span className="font-semibold w-16 text-right">{fmt(lineCost)}</span>
                              </div>
                            </div>
                          );
                        })}
                        <div className="border-t border-gourmand-border/60 pt-2.5 mt-3 flex justify-between">
                          <span className="text-xs font-semibold text-gourmand-cocoa uppercase">Rendement : {totalWeight}g</span>
                          <span className="font-bold">{fmt(totalCost)}</span>
                        </div>
                      </div>
                      {base.notes && <p className="text-xs text-gourmand-cocoa bg-gourmand-bg/50 p-3 rounded-xl">{base.notes}</p>}
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => openEdit(base)} className="flex-1 gourmand-btn-primary py-3">Modifier</button>
                        <button onClick={() => setDeleteTarget(base)} className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
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
          <div className="text-center py-16 opacity-50">
            <div className="w-16 h-16 bg-gourmand-border/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Beaker size={32} className="text-gourmand-cocoa" />
            </div>
            <p className="font-medium">Aucune préparation</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <Modal onClose={() => setShowForm(false)} title={editItem ? 'Éditer' : 'Nouvelle base'}>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-4">
                <div>
                  <FormLabel>Icône</FormLabel>
                  <input type="text" maxLength={2} className="gourmand-input w-16 text-center text-xl text-gourmand-chocolate" value={emoji} onChange={e => setEmoji(e.target.value)} />
                </div>
                <div className="flex-1">
                  <FormLabel>Nom</FormLabel>
                  <input placeholder="Ex: Pâte sucrée amande" className="gourmand-input w-full" value={name} onChange={e => setName(e.target.value)} />
                </div>
              </div>
              <div>
                <FormLabel>Type</FormLabel>
                <select className="gourmand-input w-full" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gourmand-biscuit mb-3 flex items-center gap-1.5 ml-1">
                  <Apple size={14} /> Ingrédients (g)
                </p>
                <div className="max-h-52 overflow-y-auto scrollbar-hide space-y-2">
                  {ingredients.map(ing => {
                    const val = compMap[ing.id] || 0;
                    const ingUnit = ing.unit === 'u' ? 'u' : ing.unit === 'L' ? 'ml' : 'g';
                    return (
                      <div key={ing.id} className="flex items-center justify-between p-3 bg-gourmand-bg rounded-xl">
                        <span className="text-sm font-medium flex items-center gap-2"><span className="text-lg">{ing.emoji}</span> {ing.name}</span>
                        <div className="flex items-center gap-2">
                          <input type="number" placeholder="0" value={val || ''}
                            className="w-20 bg-white border border-gourmand-border rounded-lg text-right px-3 py-1.5 text-sm font-medium focus:outline-none focus:border-gourmand-chocolate shadow-sm transition-colors"
                            onChange={e => { setCompMap(prev => ({ ...prev, [ing.id]: parseFloat(e.target.value) || 0 })); }}
                          />
                          <span className="text-xs font-medium text-gourmand-biscuit w-4">{ingUnit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <textarea placeholder="Notes techniques..." className="gourmand-input w-full resize-none h-20 text-sm" value={notes} onChange={e => setNotes(e.target.value)} />
              <button onClick={save} disabled={saving} className="gourmand-btn-primary w-full py-4 text-sm mt-2 disabled:opacity-50">
                {saving ? 'Enregistrement...' : editItem ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDialog title="Suppression" message={`Supprimer "${deleteTarget.name}" ?`} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
