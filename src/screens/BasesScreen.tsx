import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, ChevronDown, ChevronLeft, ChevronRight, Beaker, Apple, Scale, FolderOpen } from 'lucide-react';
import { Base, RawIngredient } from '../types';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { IconActionButton } from '../components/IconActionButton';
import { FormLabel } from '../components/FormLabel';
import { ScaleModal } from '../components/ScaleModal';
import { fmt, findIngredient, calculateBaseCost, calculateBaseCostPerKg } from '../lib/calculations';

/** Réutilise le libellé d'une famille existante (casse / espaces ignorés) pour éviter les doublons « Flan » / « flan ». */
function canonicalFamily(input: string, bases: Base[]): string {
  const clean = input.trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  const key = clean.toLocaleLowerCase('fr');
  return bases.find(b => b.family && b.family.toLocaleLowerCase('fr') === key)?.family ?? clean;
}

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
  const [scaleTarget, setScaleTarget] = useState<Base | null>(null);
  const [saving, setSaving] = useState(false);
  /** Famille ouverte (liste de ses variantes). null = liste générale. */
  const [openFamily, setOpenFamily] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍯');
  const [category, setCategory] = useState('Fond');
  const [notes, setNotes] = useState('');
  const [family, setFamily] = useState('');
  const [yieldQty, setYieldQty] = useState('');
  const [yieldLabel, setYieldLabel] = useState('');
  const [compMap, setCompMap] = useState<Record<string, number>>({});

  const openAdd = () => {
    setEditItem(null);
    setName(''); setEmoji('🍯'); setCategory('Fond'); setNotes(''); setCompMap({});
    setFamily(openFamily ?? ''); setYieldQty(''); setYieldLabel('');
    setShowForm(true);
  };

  /** Ouvre le formulaire de création pré-rempli avec la recette adaptée (rien n'est enregistré avant validation). */
  const openVariantFrom = (base: Base, factor: number) => {
    const round = (n: number) => Math.round(n * 10) / 10;
    const map: Record<string, number> = {};
    base.components.forEach(c => { map[c.ingredientId] = round(c.quantity * factor); });
    const label = `×${round(factor)}`;
    setEditItem(null);
    setName(`${base.name} ${label}`); setEmoji(base.emoji); setCategory(base.category); setNotes(base.notes);
    setFamily(base.family);
    setYieldQty(base.yieldQty != null ? String(round(base.yieldQty * factor)) : '');
    setYieldLabel(base.yieldLabel);
    setCompMap(map);
    setScaleTarget(null);
    setShowForm(true);
  };

  const openEdit = (base: Base) => {
    setEditItem(base);
    setName(base.name); setEmoji(base.emoji); setCategory(base.category); setNotes(base.notes);
    setFamily(base.family); setYieldQty(base.yieldQty != null ? String(base.yieldQty) : ''); setYieldLabel(base.yieldLabel);
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
    if (components.length === 0) { showToast('Veuillez ajouter au moins un ingrédient', 'error'); return; }
    if (!emoji.trim()) { showToast('Icône requise', 'error'); return; }

    const yq = parseFloat(yieldQty.replace(',', '.'));
    if (yieldQty.trim() && !(Number.isFinite(yq) && yq > 0)) { showToast('Rendement invalide', 'error'); return; }

    setSaving(true);
    const base: Base = {
      id: editItem?.id || 'base-' + Date.now(),
      name, category, emoji, notes, components,
      family: canonicalFamily(family, bases),
      yieldQty: yieldQty.trim() ? yq : null,
      yieldLabel: yieldLabel.trim(),
      createdAt: editItem?.createdAt || new Date().toISOString(),
    };
    const result = await onSave(base);
    setSaving(false);
    if (result) {
      showToast(editItem ? `${name} mis à jour` : `${name} créée`);
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

  /* ─── Regroupement par famille ─── */
  const families = useMemo(() => {
    const map = new Map<string, Base[]>();
    bases.forEach(b => {
      if (!b.family) return;
      map.set(b.family, [...(map.get(b.family) ?? []), b]);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr'));
  }, [bases]);
  const standalone = useMemo(() => bases.filter(b => !b.family), [bases]);
  // Si la dernière variante est supprimée / déplacée, on revient à la liste générale.
  const familyBases = openFamily !== null ? bases.filter(b => b.family === openFamily) : [];
  const effectiveFamily = openFamily !== null && familyBases.length > 0 ? openFamily : null;
  const visibleBases = effectiveFamily !== null ? familyBases : standalone;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full overflow-y-auto scrollbar-hide px-2 pb-32"
    >
      <PageHeader
        title={effectiveFamily ?? 'Préparations'}
        description={
          effectiveFamily !== null
            ? `${familyBases.length} variante${familyBases.length > 1 ? 's' : ''}`
            : `${bases.length} base${bases.length > 1 ? 's' : ''} maison`
        }
        action={
          <IconActionButton
            onClick={openAdd}
            icon={<Plus size={22} />}
            label="Ajouter une préparation"
            disabled={ingredients.length === 0}
          />
        }
      />

      {ingredients.length === 0 && (
        <div className="px-4 mb-4">
          <div className="bg-amber-50 text-amber-700 border border-amber-200/60 p-4 rounded-2xl text-sm font-medium">
            💡 Ajoutez d'abord des ingrédients pour créer une préparation.
          </div>
        </div>
      )}

      <div className="px-4 space-y-3">
        {effectiveFamily !== null && (
          <button
            type="button"
            onClick={() => setOpenFamily(null)}
            className="flex items-center gap-1 text-sm font-semibold text-gourmand-biscuit active:opacity-60"
          >
            <ChevronLeft size={16} /> Toutes les préparations
          </button>
        )}

        {effectiveFamily === null && families.map(([fam, members]) => (
          <button
            key={fam}
            type="button"
            onClick={() => setOpenFamily(fam)}
            className="gourmand-card flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-gourmand-bg"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gourmand-border/50 bg-gourmand-bg text-gourmand-biscuit">
              <FolderOpen size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-tight text-gourmand-chocolate">{fam}</p>
              <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-gourmand-biscuit">
                {members.length} variante{members.length > 1 ? 's' : ''} · {members.slice(0, 3).map(m => m.name).join(', ')}{members.length > 3 ? '…' : ''}
              </p>
            </div>
            <ChevronRight size={18} className="shrink-0 text-gourmand-biscuit" />
          </button>
        ))}

        {visibleBases.map(base => {
          const { totalCost, totalWeight } = calculateBaseCost(base, ingredients);
          const costPerKg = calculateBaseCostPerKg(base, ingredients);
          const isExpanded = expandedId === base.id;

          return (
            <div key={base.id} className="gourmand-card overflow-hidden">
              {/* Header toujours visible */}
              <div className="flex items-center gap-2 px-4 pt-4 pb-3">
                <div className="w-11 h-11 rounded-xl bg-gourmand-bg flex items-center justify-center text-2xl border border-gourmand-border/50 shrink-0">
                  {base.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[15px] text-gourmand-chocolate leading-tight truncate">{base.name}</p>
                  <p className="text-[10px] font-semibold text-gourmand-biscuit uppercase tracking-wide mt-0.5">
                    {base.category} · {base.components.length} composant{base.components.length > 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-base text-gourmand-chocolate tabular-nums">{fmt(costPerKg)}</p>
                    <p className="text-[10px] font-semibold text-gourmand-biscuit uppercase">/kg</p>
                  </div>

                  {/* Scale — toujours visible */}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setScaleTarget(base); }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-gourmand-border bg-gourmand-bg text-gourmand-biscuit transition-colors active:bg-gourmand-border"
                    aria-label={`Adapter la préparation ${base.name}`}
                  >
                    <Scale size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : base.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-gourmand-border bg-gourmand-bg transition-colors active:bg-gourmand-border"
                    aria-label={isExpanded ? 'Réduire' : 'Voir le détail'}
                    aria-expanded={isExpanded}
                  >
                    <ChevronDown size={16} className={`text-gourmand-biscuit transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Accordéon */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-2 space-y-3 border-t border-gourmand-border/60">
                      <div className="bg-gourmand-bg rounded-xl p-4 space-y-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-2">Composition</p>
                        {base.components.map((comp, idx) => {
                          const ing = findIngredient(ingredients, comp.ingredientId);
                          const ingName = ing?.name || 'Inconnu';
                          const ingUnit = ing?.unit === 'u' ? 'u' : ing?.unit === 'L' ? 'ml' : 'g';
                          let lineCost = 0;
                          if (ing) lineCost = ing.unit === 'u' ? ing.pricePerKg * comp.quantity : (ing.pricePerKg * comp.quantity) / 1000;
                          return (
                            <div key={idx} className="flex justify-between items-center gap-2 text-sm">
                              <span className="flex min-w-0 flex-1 items-center gap-2 font-medium">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center text-lg leading-none" aria-hidden>{ing?.emoji ?? '🥄'}</span>
                                <span className="truncate">{ingName}</span>
                              </span>
                              <div className="flex shrink-0 items-center gap-3">
                                <span className="text-gourmand-biscuit text-xs tabular-nums">{comp.quantity}{ingUnit}</span>
                                <span className="font-semibold w-14 text-right tabular-nums">{fmt(lineCost)}</span>
                              </div>
                            </div>
                          );
                        })}
                        <div className="border-t border-gourmand-border/60 pt-2.5 mt-1 flex justify-between">
                          <span className="text-xs font-semibold text-gourmand-cocoa uppercase">Rendement : {totalWeight}g</span>
                          <span className="font-bold tabular-nums">{fmt(totalCost)}</span>
                        </div>
                      </div>

                      {base.yieldQty != null && base.yieldQty > 0 && (
                        <div className="rounded-xl bg-gourmand-bg p-4">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit">Ce que je peux faire avec cette recette</p>
                          <p className="text-sm font-semibold text-gourmand-chocolate">🍰 {base.yieldQty} {base.yieldLabel}</p>
                        </div>
                      )}

                      {base.notes && (
                        <p className="text-xs text-gourmand-cocoa bg-gourmand-bg/50 p-3 rounded-xl">{base.notes}</p>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setScaleTarget(base)}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gourmand-border bg-gourmand-bg text-gourmand-cocoa font-semibold text-sm transition-colors active:bg-gourmand-border"
                        >
                          <Scale size={16} />
                          Adapter
                        </button>
                        <button onClick={() => openEdit(base)} className="flex-1 gourmand-btn-primary py-3 text-sm">
                          Modifier
                        </button>
                        <button
                          onClick={() => setDeleteTarget(base)}
                          className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center transition-colors active:bg-red-100"
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
          <div className="text-center py-16 opacity-50">
            <div className="w-16 h-16 bg-gourmand-border/50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Beaker size={32} className="text-gourmand-cocoa" />
            </div>
            <p className="font-medium">Aucune préparation</p>
            <p className="text-sm text-gourmand-biscuit mt-1">Ajoutez vos bases maison</p>
          </div>
        )}
      </div>

      {/* Formulaire */}
      <AnimatePresence>
        {showForm && (
          <Modal onClose={() => setShowForm(false)} title={editItem ? 'Modifier la préparation' : 'Nouvelle préparation'}>
            <div className="space-y-5 pb-2">
              <div className="flex items-center gap-3">
                <div>
                  <FormLabel>Icône</FormLabel>
                  <input
                    type="text" maxLength={2}
                    className="gourmand-input w-16 text-center text-xl text-gourmand-chocolate"
                    value={emoji} onChange={e => setEmoji(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <FormLabel>Nom</FormLabel>
                  <input
                    placeholder="Ex : Pâte sucrée amande"
                    className="gourmand-input w-full"
                    value={name} onChange={e => setName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <FormLabel>Type</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                        category === c
                          ? 'bg-gourmand-chocolate text-white border-gourmand-chocolate'
                          : 'bg-white text-gourmand-cocoa border-gourmand-border'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <FormLabel>Famille (optionnel)</FormLabel>
                <input
                  list="base-families"
                  placeholder="Ex : Appareil à flan — pour regrouper les variantes"
                  className="gourmand-input w-full"
                  value={family} onChange={e => setFamily(e.target.value)}
                />
                <datalist id="base-families">
                  {families.map(([fam]) => <option key={fam} value={fam} />)}
                </datalist>
              </div>

              <div>
                <FormLabel>Rendement (optionnel)</FormLabel>
                <div className="flex gap-2">
                  <input
                    type="number" inputMode="decimal" placeholder="5"
                    className="gourmand-input w-20 text-center"
                    value={yieldQty} onChange={e => setYieldQty(e.target.value)}
                  />
                  <input
                    placeholder="entremets Ø18 cm"
                    className="gourmand-input flex-1"
                    value={yieldLabel} onChange={e => setYieldLabel(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gourmand-biscuit mb-3 flex items-center gap-1.5 ml-1">
                  <Apple size={14} /> Ingrédients
                </p>
                <div className="max-h-60 overflow-y-auto scrollbar-hide space-y-2">
                  {ingredients.map(ing => {
                    const val = compMap[ing.id] || 0;
                    const ingUnit = ing.unit === 'u' ? 'u' : ing.unit === 'L' ? 'ml' : 'g';
                    return (
                      <div key={ing.id} className="flex items-center justify-between p-3 bg-gourmand-bg rounded-xl gap-2">
                        <span className="text-sm font-medium flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-xl shrink-0" aria-hidden>{ing.emoji}</span>
                          <span className="truncate">{ing.name}</span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setCompMap(prev => ({ ...prev, [ing.id]: Math.max(0, (prev[ing.id] || 0) - (ing.unit === 'u' ? 1 : 10)) }))}
                            className="h-11 w-11 rounded-lg border border-gourmand-border bg-white flex items-center justify-center text-lg font-bold text-gourmand-chocolate active:bg-gourmand-bg"
                          >−</button>
                          <input
                            type="number" inputMode="decimal" placeholder="0"
                            value={val || ''}
                            className="w-20 h-11 rounded-xl border border-gourmand-border bg-white px-2 text-center text-sm font-bold text-gourmand-chocolate focus:border-gourmand-chocolate focus:outline-none"
                            onChange={e => setCompMap(prev => ({ ...prev, [ing.id]: parseFloat(e.target.value) || 0 }))}
                          />
                          <button
                            type="button"
                            onClick={() => setCompMap(prev => ({ ...prev, [ing.id]: (prev[ing.id] || 0) + (ing.unit === 'u' ? 1 : 10) }))}
                            className="h-11 w-11 rounded-lg border border-gourmand-border bg-white flex items-center justify-center text-lg font-bold text-gourmand-chocolate active:bg-gourmand-bg"
                          >+</button>
                          <span className="text-xs font-medium text-gourmand-biscuit w-5">{ingUnit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <textarea
                placeholder="Notes techniques..."
                className="gourmand-input w-full resize-none h-20 text-sm"
                value={notes} onChange={e => setNotes(e.target.value)}
              />
              <button onClick={save} disabled={saving} className="gourmand-btn-primary w-full py-4 text-sm disabled:opacity-50">
                {saving ? 'Enregistrement…' : editItem ? 'Enregistrer' : 'Créer la préparation'}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDialog
            title="Suppression"
            message={`Supprimer "${deleteTarget.name}" ?`}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scaleTarget && (
          <ScaleModal
            target={{ type: 'base', item: scaleTarget }}
            ingredients={ingredients}
            bases={bases}
            onClose={() => setScaleTarget(null)}
            onSaveVariant={factor => openVariantFrom(scaleTarget, factor)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
