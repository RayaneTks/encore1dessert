import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Trash2, Edit2, ChevronRight } from 'lucide-react';
import { RawIngredient } from '../types';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { fmt } from '../lib/calculations';

const EMOJIS = ['🧈', '🥚', '🥛', '🫙', '🌰', '🥜', '📦', '🍬', '🌾', '🍫', '🫒', '🧂', '🥐', '🍋', '🫐'];
const CATEGORIES = ['Crèmerie', 'Élevage', 'Épicerie', 'Fruits secs', 'Chocolat', 'Autre'];

interface Props {
  ingredients: RawIngredient[];
  setIngredients: React.Dispatch<React.SetStateAction<RawIngredient[]>>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const IngredientsScreen: React.FC<Props> = ({ ingredients, setIngredients, showToast }) => {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<RawIngredient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RawIngredient | null>(null);

  // Form state
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

  const save = () => {
    if (!name || !price) return;
    const priceVal = parseFloat(price);
    if (isNaN(priceVal) || priceVal <= 0) return;

    const label = purchaseLabel || `${priceVal.toFixed(2)} €/${unit}`;

    if (editItem) {
      setIngredients(prev => prev.map(i =>
        i.id === editItem.id ? { ...i, name, pricePerKg: priceVal, unit, category, emoji, purchaseLabel: label, notes } : i
      ));
      showToast(`${name} mis à jour`);
    } else {
      const newItem: RawIngredient = {
        id: 'ing-' + Date.now(),
        name, pricePerKg: priceVal, unit, category, emoji, purchaseLabel: label, notes,
        createdAt: new Date().toISOString(),
      };
      setIngredients(prev => [...prev, newItem]);
      showToast(`${name} ajouté`);
    }
    setShowForm(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setIngredients(prev => prev.filter(i => i.id !== deleteTarget.id));
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full overflow-y-auto scrollbar-hide px-2 pb-32"
    >
      <PageHeader
        title="Matières Premières"
        description={`${ingredients.length} ingrédient${ingredients.length > 1 ? 's' : ''} référencé${ingredients.length > 1 ? 's' : ''}`}
        action={
          <button onClick={openAdd} className="w-10 h-10 rounded-2xl bg-gourmand-chocolate text-white flex items-center justify-center active:scale-95 shadow-lg">
            <Plus size={24} />
          </button>
        }
      />

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="gourmand-input flex items-center gap-3 bg-white shadow-sm overflow-hidden">
          <Search size={18} className="text-gourmand-cocoa/40 flex-shrink-0" />
          <input
            placeholder="Rechercher..."
            className="bg-transparent flex-1 outline-none border-none focus:ring-0 text-sm font-bold"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="px-4">
        <SectionCard padding={false}>
          <div className="divide-y divide-gourmand-border">
            {filtered.map(ing => (
              <button
                key={ing.id}
                onClick={() => openEdit(ing)}
                className="w-full p-4 flex items-center justify-between active:bg-gourmand-bg/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl flex-shrink-0">{ing.emoji}</span>
                  <div className="min-w-0">
                    <p className="font-black italic text-base leading-tight truncate">{ing.name}</p>
                    <p className="text-[10px] font-bold text-gourmand-cocoa/40 uppercase">{ing.category} · {unitLabel(ing.unit)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className="font-black text-gourmand-strawberry text-right">{fmt(ing.pricePerKg)}</p>
                  <ChevronRight size={16} className="text-gourmand-cocoa/20" />
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="p-8 text-center opacity-30 text-xs font-bold uppercase tracking-widest">Aucun résultat</div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <Modal onClose={() => setShowForm(false)} title={editItem ? 'Modifier l\'ingrédient' : 'Nouvel Ingrédient'}>
            <div className="p-5 space-y-4">
              {/* Emoji picker */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gourmand-cocoa/40 mb-2">Icône</p>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${emoji === e ? 'bg-gourmand-strawberry/10 ring-2 ring-gourmand-strawberry scale-110' : 'bg-gourmand-bg'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <input
                placeholder="Nom (ex: Farine T55)"
                className="gourmand-input w-full"
                value={name}
                onChange={e => setName(e.target.value)}
              />

              <div className="flex gap-2">
                <input
                  placeholder="Prix"
                  type="number"
                  step="0.01"
                  className="gourmand-input flex-1"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                />
                <select className="gourmand-input w-20" value={unit} onChange={e => setUnit(e.target.value as any)}>
                  <option value="kg">kg</option>
                  <option value="L">L</option>
                  <option value="u">unité</option>
                </select>
              </div>

              <select className="gourmand-input w-full" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <input
                placeholder="Étiquette achat (ex: 4,29€ les 20)"
                className="gourmand-input w-full"
                value={purchaseLabel}
                onChange={e => setPurchaseLabel(e.target.value)}
              />

              <textarea
                placeholder="Notes (optionnel)"
                className="gourmand-input w-full resize-none h-20"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />

              <button onClick={save} className="gourmand-btn-primary w-full py-4 text-sm">
                {editItem ? 'Enregistrer les modifications' : 'Ajouter l\'ingrédient'}
              </button>

              {editItem && (
                <button
                  onClick={() => { setShowForm(false); setDeleteTarget(editItem); }}
                  className="w-full py-3 text-[11px] font-black uppercase tracking-widest text-red-400 flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Supprimer cet ingrédient
                </button>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDialog
            title="Supprimer l'ingrédient"
            message={`"${deleteTarget.name}" sera retiré de votre inventaire. Les bases et desserts qui l'utilisent ne pourront plus calculer leur coût correctement.`}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};
