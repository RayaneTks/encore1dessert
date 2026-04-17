import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Trash2, ChevronRight } from 'lucide-react';
import { RawIngredient } from '../types';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { fmt } from '../lib/calculations';


const CATEGORIES = ['Crèmerie', 'Élevage', 'Épicerie', 'Fruits secs', 'Chocolat', 'Autre'];

interface Props {
  ingredients: RawIngredient[];
  onSave: (ing: RawIngredient) => Promise<RawIngredient | null>;
  onDelete: (id: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const IngredientsScreen: React.FC<Props> = ({ ingredients, onSave, onDelete, showToast }) => {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<RawIngredient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RawIngredient | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState<'kg' | 'L' | 'u'>('kg');
  const [category, setCategory] = useState('Épicerie');
  const [emoji, setEmoji] = useState('🥐');
  const [purchaseLabel, setPurchaseLabel] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = ingredients.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditItem(null);
    setName(''); setPrice(''); setUnit('kg'); setCategory('Épicerie'); setEmoji('🥐'); setPurchaseLabel(''); setNotes('');
    setShowForm(true);
  };

  const openEdit = (ing: RawIngredient) => {
    setEditItem(ing);
    setName(ing.name);
    setPrice(ing.pricePerKg.toString());
    setUnit(ing.unit);
    setCategory(ing.category);
    setEmoji(ing.emoji);
    setPurchaseLabel(ing.purchaseLabel);
    setNotes(ing.notes);
    setShowForm(true);
  };

  const save = async () => {
    if (!name.trim()) { showToast('Veuillez saisir un nom', 'error'); return; }
    if (!price) { showToast('Veuillez saisir un prix', 'error'); return; }
    const priceVal = parseFloat(price);
    if (isNaN(priceVal) || priceVal <= 0) { showToast('Prix invalide', 'error'); return; }
    if (!emoji.trim()) { showToast('Icône requise', 'error'); return; }

    const label = purchaseLabel || `${priceVal.toFixed(2)} €/${unit}`;

    setSaving(true);
    const ing: RawIngredient = {
      id: editItem?.id || 'ing-' + Date.now(),
      name, pricePerKg: priceVal, unit, category, emoji, purchaseLabel: label, notes,
      createdAt: editItem?.createdAt || new Date().toISOString(),
    };
    const result = await onSave(ing);
    setSaving(false);
    if (result) {
      showToast(editItem ? `${name} mis à jour` : `${name} ajouté`);
      setShowForm(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await onDelete(deleteTarget.id);
    showToast(`${deleteTarget.name} supprimé`, 'info');
    setDeleteTarget(null);
  };

  const unitLabel = (u: string) => {
    if (u === 'L') return '/L';
    if (u === 'u') return '/unité';
    return '/kg';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full overflow-y-auto scrollbar-hide px-2 pb-32"
    >
      <PageHeader
        title="Matières Premières"
        description={`${ingredients.length} ingrédient${ingredients.length > 1 ? 's' : ''} référencé${ingredients.length > 1 ? 's' : ''}`}
        action={
          <button onClick={openAdd} className="w-10 h-10 rounded-xl bg-gourmand-chocolate text-white flex items-center justify-center active:scale-95 shadow-sm transition-transform">
            <Plus size={22} />
          </button>
        }
      />

      <div className="px-4 mb-4">
        <div className="gourmand-input flex items-center gap-3 bg-white shadow-sm overflow-hidden py-3">
          <Search size={18} className="text-gourmand-biscuit flex-shrink-0" />
          <input
            placeholder="Rechercher une matière..."
            className="bg-transparent flex-1 outline-none border-none focus:ring-0 text-sm font-medium"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="px-4">
        <SectionCard padding={false}>
          <div className="divide-y divide-gourmand-border/50">
            {filtered.map(ing => (
              <button
                key={ing.id}
                onClick={() => openEdit(ing)}
                className="w-full p-4 flex items-center justify-between hover:bg-gourmand-bg/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl flex-shrink-0">{ing.emoji}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-base text-gourmand-chocolate leading-tight truncate mb-0.5">{ing.name}</p>
                    <p className="text-[10px] font-medium text-gourmand-biscuit uppercase tracking-wide">{ing.category} · {unitLabel(ing.unit)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className="font-semibold text-gourmand-chocolate text-right">{fmt(ing.pricePerKg)}</p>
                  <ChevronRight size={16} className="text-gourmand-biscuit" />
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-8 text-center opacity-50 text-xs font-semibold uppercase tracking-widest text-gourmand-biscuit">Aucun résultat</div>
            )}
          </div>
        </SectionCard>
      </div>

      <AnimatePresence>
        {showForm && (
          <Modal onClose={() => setShowForm(false)} title={editItem ? 'Modifier' : 'Nouveau'}>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1.5 ml-1">Icône</p>
                  <input type="text" maxLength={2} className="gourmand-input w-16 text-center text-xl" value={emoji} onChange={e => setEmoji(e.target.value)} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1.5 ml-1">Nom</p>
                  <input placeholder="Ex: Farine T55" className="gourmand-input w-full" value={name} onChange={e => setName(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1.5 ml-1">Prix</p>
                  <input placeholder="0.00" type="number" step="0.01" className="gourmand-input w-full" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
                <div className="w-24">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1.5 ml-1">Unité</p>
                  <select className="gourmand-input w-full" value={unit} onChange={e => setUnit(e.target.value as any)}>
                    <option value="kg">kg</option>
                    <option value="L">L</option>
                    <option value="u">unité</option>
                  </select>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1.5 ml-1">Catégorie</p>
                <select className="gourmand-input w-full" value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gourmand-biscuit mb-1.5 ml-1">Étiquette d'achat (Mémo)</p>
                <input placeholder="Ex: 4,29€ les 20" className="gourmand-input w-full" value={purchaseLabel} onChange={e => setPurchaseLabel(e.target.value)} />
              </div>
              <textarea placeholder="Notes..." className="gourmand-input w-full resize-none h-20 text-sm" value={notes} onChange={e => setNotes(e.target.value)} />
              <button onClick={save} disabled={saving} className="gourmand-btn-primary w-full py-4 text-sm mt-2 disabled:opacity-50">
                {saving ? 'Enregistrement...' : editItem ? 'Enregistrer' : 'Ajouter'}
              </button>
              {editItem && (
                <button onClick={() => { setShowForm(false); setDeleteTarget(editItem); }}
                  className="w-full py-3 text-[11px] font-bold uppercase tracking-widest text-red-500 bg-red-50 rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors mt-2">
                  <Trash2 size={16} /> Supprimer
                </button>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDialog title="Suppression" message={`Retirer "${deleteTarget.name}" ?`} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
