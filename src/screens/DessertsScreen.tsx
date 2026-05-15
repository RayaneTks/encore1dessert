import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, ChevronDown, Beaker, Apple, ChefHat, Scale } from 'lucide-react';
import { Dessert, RawIngredient, Base, DessertProductKind, DESSERT_PRODUCT_KIND_OPTIONS } from '../types';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { IconActionButton } from '../components/IconActionButton';
import { FormLabel } from '../components/FormLabel';
import { ScaleModal } from '../components/ScaleModal';
import {
  fmt,
  calculateDessertCost,
  resolveComponentName,
  resolveComponentEmoji,
  resolveComponentUnit,
  findIngredient,
  calculateBaseCostPerKg,
  findBase,
} from '../lib/calculations';

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
  const [scaleTarget, setScaleTarget] = useState<Dessert | null>(null);
  const [saving, setSaving] = useState(false);

  /* Form state */
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🍰');
  const [sellPriceParticulier, setSellPriceParticulier] = useState('');
  const [sellPricePro, setSellPricePro] = useState('');
  const [servings, setServings] = useState('8');
  const [notes, setNotes] = useState('');
  const [productKind, setProductKind] = useState<DessertProductKind>('tarte');
  const [compMap, setCompMap] = useState<Record<string, { type: 'ingredient' | 'base'; qty: number }>>({});

  const openAdd = () => {
    setEditItem(null);
    setName(''); setEmoji('🍰'); setSellPriceParticulier(''); setSellPricePro('');
    setServings('8'); setNotes(''); setProductKind('tarte'); setCompMap({});
    setShowForm(true);
  };

  const openEdit = (d: Dessert) => {
    setEditItem(d);
    setName(d.name); setEmoji(d.emoji);
    setSellPriceParticulier(d.sellPriceParticulier.toString());
    setSellPricePro(d.sellPricePro.toString());
    setServings(d.servings.toString());
    setProductKind(d.productKind ?? 'tarte');
    setNotes(d.notes);
    const map: Record<string, { type: 'ingredient' | 'base'; qty: number }> = {};
    d.components.forEach(c => { map[c.id] = { type: c.type, qty: c.quantity }; });
    setCompMap(map);
    setShowForm(true);
  };

  const save = async () => {
    if (!name.trim()) { showToast('Veuillez saisir un nom', 'error'); return; }
    const pPart = parseFloat(sellPriceParticulier);
    if (isNaN(pPart) || pPart < 0) { showToast('Prix Particulier invalide', 'error'); return; }
    const pPro = parseFloat(sellPricePro);
    if (isNaN(pPro) || pPro < 0) { showToast('Prix Pro invalide', 'error'); return; }
    const sVal = parseInt(servings);
    if (isNaN(sVal) || sVal <= 0) { showToast('Nombre de parts invalide (minimum 1)', 'error'); return; }
    const components = Object.entries(compMap)
      .filter(([, v]) => v.qty > 0)
      .map(([id, v]) => ({ type: v.type, id, quantity: v.qty }));
    if (components.length === 0) { showToast('Ajoutez au moins un composant à la recette', 'error'); return; }
    if (!emoji.trim()) { showToast('Icône requise', 'error'); return; }

    setSaving(true);
    const dessert: Dessert = {
      id: editItem?.id || 'dessert-' + Date.now(),
      name, emoji,
      sellPriceParticulier: pPart,
      sellPricePro: pPro,
      servings: sVal,
      productKind,
      notes, components,
      createdAt: editItem?.createdAt || new Date().toISOString(),
    };
    const result = await onSave(dessert);
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

  const marginColor = (rate: number) => {
    if (rate >= 0.6) return 'text-emerald-600';
    if (rate >= 0.4) return 'text-amber-500';
    return 'text-red-500';
  };

  const marginBarColor = (rate: number) => {
    if (rate >= 0.6) return '#16a34a';
    if (rate >= 0.4) return '#f59e0b';
    return '#ef4444';
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

  const liveParticulierPrice = parseFloat(sellPriceParticulier) || 0;
  const liveProPrice = parseFloat(sellPricePro) || 0;
  const liveParticulierMargin = liveParticulierPrice - liveCost;
  const liveParticulierMarginRate = liveParticulierPrice > 0 ? liveParticulierMargin / liveParticulierPrice : 0;
  const liveProMargin = liveProPrice - liveCost;
  const liveProMarginRate = liveProPrice > 0 ? liveProMargin / liveProPrice : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full overflow-y-auto scrollbar-hide px-2 pb-32"
    >
      <PageHeader
        title="Recettes"
        description={`${desserts.length} recette${desserts.length > 1 ? 's' : ''} disponibles`}
        action={
          <IconActionButton
            disabled={ingredients.length === 0 && bases.length === 0}
            onClick={openAdd}
            icon={<Plus size={22} />}
            label="Ajouter une recette"
          />
        }
      />

      {ingredients.length === 0 && bases.length === 0 && (
        <div className="px-4 mb-4">
          <div className="bg-amber-50 text-amber-700 border border-amber-200/60 p-4 rounded-2xl text-sm font-medium">
            💡 Ajoutez d'abord des matières premières pour pouvoir créer une recette.
          </div>
        </div>
      )}

      <div className="px-4 space-y-3">
        {desserts.map(d => {
          const cost = calculateDessertCost(d, ingredients, bases);
          const margin = d.sellPriceParticulier - cost;
          const marginRate = d.sellPriceParticulier > 0 ? margin / d.sellPriceParticulier : 0;
          const coeff = cost > 0 ? d.sellPriceParticulier / cost : 0;
          const proMargin = d.sellPricePro - cost;
          const proMarginRate = d.sellPricePro > 0 ? proMargin / d.sellPricePro : 0;
          const costPerServing = d.servings > 0 ? cost / d.servings : 0;
          const isExpanded = expandedId === d.id;
          const kindLabel = DESSERT_PRODUCT_KIND_OPTIONS.find(k => k.value === (d.productKind ?? 'tarte'))?.label ?? d.productKind;

          return (
            <div key={d.id} className="gourmand-card overflow-hidden">
              {/* Card header — toujours visible */}
              <div className="flex items-center gap-1 px-4 pt-4 pb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl shrink-0">{d.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[15px] text-gourmand-chocolate leading-tight truncate">{d.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="rounded-md bg-gourmand-bg px-1.5 py-0.5 text-[10px] font-semibold text-gourmand-cocoa border border-gourmand-border/50">
                        {kindLabel}
                      </span>
                      <span className="text-[10px] text-gourmand-biscuit font-medium">{d.servings} parts</span>
                      <span className="text-[10px] text-gourmand-border">·</span>
                      <span className="text-[10px] text-gourmand-biscuit font-medium">×{coeff.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Prix + marge + boutons d'action */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-base text-gourmand-chocolate">{fmt(d.sellPriceParticulier)}</p>
                    <p className={`text-[10px] font-bold ${marginColor(marginRate)}`}>
                      {(marginRate * 100).toFixed(0)}%
                    </p>
                    {/* Barre de marge visuelle */}
                    <div className="margin-bar-track w-16 mt-1">
                      <div
                        className="margin-bar-fill"
                        style={{
                          width: `${Math.min(100, Math.max(0, marginRate * 100))}%`,
                          backgroundColor: marginBarColor(marginRate),
                        }}
                      />
                    </div>
                  </div>

                  {/* Bouton Scale — toujours visible */}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setScaleTarget(d); }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-gourmand-border bg-gourmand-bg text-gourmand-biscuit transition-colors active:bg-gourmand-border shrink-0"
                    aria-label={`Adapter la recette ${d.name}`}
                  >
                    <Scale size={16} />
                  </button>

                  {/* Chevron expand */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : d.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-gourmand-border bg-gourmand-bg transition-colors active:bg-gourmand-border shrink-0"
                    aria-label={isExpanded ? 'Réduire' : 'Voir le détail'}
                    aria-expanded={isExpanded}
                  >
                    <ChevronDown size={16} className={`text-gourmand-biscuit transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Accordéon détail */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gourmand-border/60">
                      {/* Grid stats */}
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="bg-gourmand-bg rounded-xl p-3 text-center">
                          <p className="text-[10px] font-semibold text-gourmand-biscuit mb-0.5">Coût unitaire</p>
                          <p className="font-bold text-sm">{fmt(cost)}</p>
                        </div>
                        <div className="bg-gourmand-bg rounded-xl p-3 text-center">
                          <p className="text-[10px] font-semibold text-gourmand-biscuit mb-0.5">Marge Part.</p>
                          <p className={`font-bold text-sm ${marginColor(marginRate)}`}>{fmt(margin)}</p>
                        </div>
                        <div className="bg-gourmand-bg rounded-xl p-3 text-center">
                          <p className="text-[10px] font-semibold text-gourmand-biscuit mb-0.5">Marge Pro</p>
                          <p className={`font-bold text-sm ${marginColor(proMarginRate)}`}>{fmt(proMargin)}</p>
                        </div>
                        <div className="bg-gourmand-bg rounded-xl p-3 text-center">
                          <p className="text-[10px] font-semibold text-gourmand-biscuit mb-0.5">Coût / part</p>
                          <p className="font-bold text-sm">{fmt(costPerServing)}</p>
                        </div>
                        <div className="bg-gourmand-bg rounded-xl p-3 text-center">
                          <p className="text-[10px] font-semibold text-gourmand-biscuit mb-0.5">Coefficient</p>
                          <p className="font-bold text-sm">×{coeff.toFixed(1)}</p>
                        </div>
                        <div className="bg-gourmand-bg rounded-xl p-3 text-center">
                          <p className="text-[10px] font-semibold text-gourmand-biscuit mb-0.5">Prix Pro</p>
                          <p className="font-bold text-sm">{fmt(d.sellPricePro)}</p>
                        </div>
                      </div>

                      {/* Composition */}
                      <div className="bg-gourmand-bg rounded-xl p-4">
                        <p className="text-[10px] font-semibold text-gourmand-biscuit uppercase tracking-wide mb-3">Composition</p>
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
                            const cEmoji = resolveComponentEmoji(comp.type, comp.id, ingredients, bases);
                            return (
                              <div key={idx} className="flex justify-between items-center gap-2 text-sm">
                                <span className="flex min-w-0 flex-1 items-center gap-2 font-medium text-gourmand-chocolate">
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center text-lg leading-none" aria-hidden>{cEmoji}</span>
                                  <span className="truncate">{cName}</span>
                                </span>
                                <div className="flex shrink-0 items-center gap-3">
                                  <span className="text-gourmand-biscuit text-xs tabular-nums">{comp.quantity}{cUnit}</span>
                                  <span className="font-semibold text-gourmand-chocolate w-14 text-right tabular-nums">{fmt(lineCost)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="border-t border-gourmand-border/60 pt-2.5 mt-3 flex justify-between items-center">
                          <span className="text-xs font-semibold text-gourmand-cocoa uppercase">Coût total</span>
                          <span className="font-bold tabular-nums">{fmt(cost)}</span>
                        </div>
                      </div>

                      {d.notes && (
                        <p className="text-xs text-gourmand-cocoa bg-gourmand-bg/50 p-3 rounded-xl">{d.notes}</p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setScaleTarget(d)}
                          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gourmand-border bg-gourmand-bg text-gourmand-cocoa font-semibold text-sm transition-colors active:bg-gourmand-border"
                        >
                          <Scale size={16} />
                          Adapter
                        </button>
                        <button onClick={() => openEdit(d)} className="flex-1 gourmand-btn-primary py-3 text-sm">
                          Modifier
                        </button>
                        <button
                          onClick={() => setDeleteTarget(d)}
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

        {desserts.length === 0 && (
          <div className="text-center py-16 opacity-50">
            <div className="w-16 h-16 rounded-full bg-gourmand-border/50 flex items-center justify-center mx-auto mb-3">
              <ChefHat size={32} className="text-gourmand-cocoa" />
            </div>
            <p className="font-medium">Aucune recette</p>
            <p className="text-sm text-gourmand-biscuit mt-1">Commencez par ajouter vos matières premières</p>
          </div>
        )}
      </div>

      {/* Modal formulaire */}
      <AnimatePresence>
        {showForm && (
          <Modal onClose={() => setShowForm(false)} title={editItem ? 'Modifier la recette' : 'Nouvelle recette'}>
            <div className="flex flex-col max-h-[85vh]">
              <div className="flex-1 overflow-y-auto space-y-5 pb-36 scrollbar-hide">
                <div className="space-y-4">
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
                      <FormLabel>Nom du produit</FormLabel>
                      <input
                        placeholder="Ex : Tarte Citron"
                        className="gourmand-input w-full text-base"
                        value={name} onChange={e => setName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <FormLabel>Famille</FormLabel>
                    <div className="flex gap-2 flex-wrap">
                      {DESSERT_PRODUCT_KIND_OPTIONS.map(o => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setProductKind(o.value)}
                          className={`px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                            productKind === o.value
                              ? 'bg-gourmand-chocolate text-white border-gourmand-chocolate'
                              : 'bg-white text-gourmand-cocoa border-gourmand-border'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FormLabel>Prix Particulier (€)</FormLabel>
                      <input
                        type="number" step="0.5" inputMode="decimal"
                        className="gourmand-input w-full"
                        value={sellPriceParticulier} onChange={e => setSellPriceParticulier(e.target.value)}
                      />
                    </div>
                    <div>
                      <FormLabel>Prix Pro (€)</FormLabel>
                      <input
                        type="number" step="0.5" inputMode="decimal"
                        className="gourmand-input w-full"
                        value={sellPricePro} onChange={e => setSellPricePro(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 items-end">
                    <div className="w-28">
                      <FormLabel>Nombre de parts</FormLabel>
                      <input
                        type="number" inputMode="numeric"
                        className="gourmand-input w-full text-center"
                        value={servings} onChange={e => setServings(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {bases.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gourmand-biscuit uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Beaker size={14} /> Préparations maison (g)
                    </h4>
                    <div className="space-y-2">
                      {bases.map(b => (
                        <div key={b.id} className="flex items-center justify-between gap-2 p-3 bg-gourmand-bg rounded-xl">
                          <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
                            <span className="text-xl w-9 text-center shrink-0" aria-hidden>{b.emoji}</span>
                            <span className="truncate">{b.name}</span>
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setCompMap(prev => ({ ...prev, [b.id]: { type: 'base', qty: Math.max(0, (prev[b.id]?.qty || 0) - 10) } }))}
                              className="h-11 w-11 rounded-lg border border-gourmand-border bg-white flex items-center justify-center text-lg font-bold text-gourmand-chocolate active:bg-gourmand-bg"
                            >−</button>
                            <input
                              type="number" inputMode="decimal" placeholder="0"
                              value={compMap[b.id]?.qty || ''}
                              className="w-20 h-11 rounded-xl border border-gourmand-border bg-white px-2 text-center text-sm font-bold text-gourmand-chocolate focus:border-gourmand-chocolate focus:outline-none"
                              onChange={e => setCompMap(prev => ({ ...prev, [b.id]: { type: 'base', qty: parseFloat(e.target.value) || 0 } }))}
                            />
                            <button
                              type="button"
                              onClick={() => setCompMap(prev => ({ ...prev, [b.id]: { type: 'base', qty: (prev[b.id]?.qty || 0) + 10 } }))}
                              className="h-11 w-11 rounded-lg border border-gourmand-border bg-white flex items-center justify-center text-lg font-bold text-gourmand-chocolate active:bg-gourmand-bg"
                            >+</button>
                            <span className="text-xs font-medium text-gourmand-biscuit w-4">g</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold text-gourmand-biscuit uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Apple size={14} /> Matières premières
                  </h4>
                  <div className="space-y-2">
                    {ingredients.map(i => {
                      const iUnit = i.unit === 'u' ? 'u' : i.unit === 'L' ? 'ml' : 'g';
                      return (
                        <div key={i.id} className="flex items-center justify-between gap-2 p-3 bg-gourmand-bg rounded-xl">
                          <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
                            <span className="text-xl w-9 text-center shrink-0" aria-hidden>{i.emoji}</span>
                            <span className="truncate">{i.name}</span>
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setCompMap(prev => ({ ...prev, [i.id]: { type: 'ingredient', qty: Math.max(0, (prev[i.id]?.qty || 0) - (i.unit === 'u' ? 1 : 10)) } }))}
                              className="h-11 w-11 rounded-lg border border-gourmand-border bg-white flex items-center justify-center text-lg font-bold text-gourmand-chocolate active:bg-gourmand-bg"
                            >−</button>
                            <input
                              type="number" inputMode="decimal" placeholder="0"
                              value={compMap[i.id]?.qty || ''}
                              className="w-20 h-11 rounded-xl border border-gourmand-border bg-white px-2 text-center text-sm font-bold text-gourmand-chocolate focus:border-gourmand-chocolate focus:outline-none"
                              onChange={e => setCompMap(prev => ({ ...prev, [i.id]: { type: 'ingredient', qty: parseFloat(e.target.value) || 0 } }))}
                            />
                            <button
                              type="button"
                              onClick={() => setCompMap(prev => ({ ...prev, [i.id]: { type: 'ingredient', qty: (prev[i.id]?.qty || 0) + (i.unit === 'u' ? 1 : 10) } }))}
                              className="h-11 w-11 rounded-lg border border-gourmand-border bg-white flex items-center justify-center text-lg font-bold text-gourmand-chocolate active:bg-gourmand-bg"
                            >+</button>
                            <span className="text-xs font-medium text-gourmand-biscuit w-4">{iUnit}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <textarea
                  placeholder="Notes techniques..."
                  className="gourmand-input w-full resize-none h-24 text-sm"
                  value={notes} onChange={e => setNotes(e.target.value)}
                />
              </div>

              {/* Footer sticky */}
              <div className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gourmand-border shadow-[0_-10px_40px_rgba(36,19,9,0.06)] rounded-b-3xl">
                <div className="flex justify-between items-center mb-3 px-1">
                  <div>
                    <p className="text-[10px] text-gourmand-biscuit font-semibold uppercase">Coût direct</p>
                    <p className="text-base font-bold">{fmt(liveCost)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gourmand-biscuit font-semibold uppercase">Marge Part. / Pro</p>
                    <p className={`text-base font-bold ${liveParticulierPrice > 0 ? (liveParticulierMarginRate >= 0.6 ? 'text-emerald-600' : liveParticulierMarginRate >= 0.4 ? 'text-amber-500' : 'text-red-500') : 'text-gourmand-biscuit'}`}>
                      {liveParticulierPrice > 0 ? `${fmt(liveParticulierMargin)} (${(liveParticulierMarginRate * 100).toFixed(0)}%)` : '—'}
                    </p>
                    <p className={`text-xs font-semibold ${liveProPrice > 0 ? (liveProMarginRate >= 0.6 ? 'text-emerald-600' : liveProMarginRate >= 0.4 ? 'text-amber-500' : 'text-red-500') : 'text-gourmand-biscuit'}`}>
                      {liveProPrice > 0 ? `${fmt(liveProMargin)} (${(liveProMarginRate * 100).toFixed(0)}%)` : '—'}
                    </p>
                  </div>
                </div>
                <button onClick={save} disabled={saving} className="gourmand-btn-primary w-full py-3.5 text-sm disabled:opacity-50">
                  {saving ? 'Enregistrement…' : editItem ? 'Mettre à jour' : 'Enregistrer la recette'}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Confirm delete */}
      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDialog
            title="Supprimer"
            message={`Supprimer "${deleteTarget.name}" définitivement ?`}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* Scale modal */}
      <AnimatePresence>
        {scaleTarget && (
          <ScaleModal
            target={{ type: 'dessert', item: scaleTarget }}
            ingredients={ingredients}
            bases={bases}
            onClose={() => setScaleTarget(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
