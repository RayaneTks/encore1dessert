import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import MobileSheet from './MobileSheet';

function fieldValue(value, fallback = '') {
  return value ?? fallback;
}

function buildInitialForm(sheet, rawIngredients, preparedComponents, desserts) {
  if (!sheet) {
    return {};
  }

  if (sheet.kind === 'ingredient') {
    return {
      name: fieldValue(sheet.item?.name),
      category: fieldValue(sheet.item?.category, 'Épicerie'),
      pricingUnit: fieldValue(sheet.item?.pricingUnit, 'kg'),
      normalizedUnitPrice: fieldValue(sheet.item?.normalizedUnitPrice, '0'),
      purchaseLabel: fieldValue(sheet.item?.purchaseLabel),
      notes: fieldValue(sheet.item?.notes),
    };
  }

  if (sheet.kind === 'preparation') {
    return {
      name: fieldValue(sheet.item?.name),
      category: fieldValue(sheet.item?.category, 'Base'),
      manualCostPerKg: fieldValue(sheet.item?.manualCostPerKg, '0'),
      notes: fieldValue(sheet.item?.notes),
      futureRecipeDetails: fieldValue(
        sheet.item?.futureRecipeDetails,
        'Détail matières premières à brancher plus tard.',
      ),
    };
  }

  if (sheet.kind === 'dessert') {
    return {
      name: fieldValue(sheet.item?.name),
      servings: fieldValue(sheet.item?.servings, 8),
      sellPrice: fieldValue(sheet.item?.sellPrice, 0),
    };
  }

  if (sheet.kind === 'line') {
    const sourceType = fieldValue(sheet.line?.sourceType, 'preparation');
    const initialOptions = sourceType === 'raw' ? rawIngredients : preparedComponents;

    return {
      sourceType,
      sourceId: fieldValue(sheet.line?.sourceId, initialOptions[0]?.id ?? ''),
      gramsOrUnits: fieldValue(sheet.line?.gramsOrUnits, 0),
    };
  }

  return {
    date: fieldValue(sheet.item?.date, new Date().toISOString().slice(0, 10)),
    dessertId: fieldValue(sheet.item?.dessertId, desserts[0]?.id ?? ''),
    quantity: fieldValue(sheet.item?.quantity, 1),
    totalRevenue: fieldValue(sheet.item?.totalRevenue, desserts[0]?.sellPrice ?? 0),
  };
}

function EditorSheet({
  sheet,
  rawIngredients,
  preparedComponents,
  desserts,
  onClose,
  onSaveIngredient,
  onDeleteIngredient,
  onSavePreparation,
  onDeletePreparation,
  onSaveDessert,
  onDeleteDessert,
  onSaveLine,
  onDeleteLine,
  onSaveJournalEntry,
  onDeleteJournalEntry,
}) {
  const [form, setForm] = useState(() =>
    buildInitialForm(sheet, rawIngredients, preparedComponents, desserts),
  );

  const sourceOptions = useMemo(() => {
    if (!sheet || sheet.kind !== 'line') {
      return [];
    }

    return form.sourceType === 'raw' ? rawIngredients : preparedComponents;
  }, [form.sourceType, preparedComponents, rawIngredients, sheet]);

  if (!sheet) {
    return null;
  }

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const footer = [];

  const submitButton = (key, label, onClick) => (
    <button key={key} type="button" className="btn-primary" onClick={onClick}>
      {label}
    </button>
  );

  const deleteButton = (key, label, onClick) => (
    <button key={key} type="button" className="btn-danger" onClick={onClick}>
      <Trash2 size={16} />
      {label}
    </button>
  );

  if (sheet.kind === 'ingredient') {
    const handleSave = () => {
      onSaveIngredient(sheet.item?.id ?? null, {
        name: form.name.trim(),
        category: form.category.trim(),
        pricingUnit: form.pricingUnit,
        normalizedUnitPrice: Number(form.normalizedUnitPrice) || 0,
        purchaseLabel: form.purchaseLabel.trim(),
        notes: form.notes.trim(),
      });
    };

    footer.push(submitButton('save-ingredient', sheet.item ? 'Enregistrer' : 'Ajouter', handleSave));
    if (sheet.item) {
      footer.unshift(deleteButton('delete-ingredient', 'Supprimer', () => onDeleteIngredient(sheet.item.id)));
    }

    return (
      <MobileSheet
        open
        title={sheet.item ? 'Modifier un achat' : 'Nouvel achat'}
        subtitle="Prix normalisé par kg, litre ou unité."
        onClose={onClose}
        footer={footer}
      >
        <div className="form-grid">
          <label className="form-field">
            <span>Nom</span>
            <input value={form.name || ''} onChange={(event) => setField('name', event.target.value)} />
          </label>

          <label className="form-field">
            <span>Catégorie</span>
            <input value={form.category || ''} onChange={(event) => setField('category', event.target.value)} />
          </label>

          <label className="form-field">
            <span>Unité</span>
            <select value={form.pricingUnit || 'kg'} onChange={(event) => setField('pricingUnit', event.target.value)}>
              <option value="kg">kg</option>
              <option value="L">L</option>
              <option value="unit">unité</option>
            </select>
          </label>

          <label className="form-field">
            <span>Prix normalisé</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.normalizedUnitPrice || 0}
              onChange={(event) => setField('normalizedUnitPrice', event.target.value)}
            />
          </label>

          <label className="form-field form-field--full">
            <span>Libellé achat</span>
            <input
              value={form.purchaseLabel || ''}
              onChange={(event) => setField('purchaseLabel', event.target.value)}
              placeholder="Ex. 4,29 € les 20"
            />
          </label>

          <label className="form-field form-field--full">
            <span>Notes</span>
            <textarea
              rows="3"
              value={form.notes || ''}
              onChange={(event) => setField('notes', event.target.value)}
            />
          </label>
        </div>
      </MobileSheet>
    );
  }

  if (sheet.kind === 'preparation') {
    const handleSave = () => {
      onSavePreparation(sheet.item?.id ?? null, {
        name: form.name.trim(),
        category: form.category.trim(),
        manualCostPerKg: Number(form.manualCostPerKg) || 0,
        notes: form.notes.trim(),
        futureRecipeDetails: form.futureRecipeDetails.trim(),
      });
    };

    footer.push(submitButton('save-preparation', sheet.item ? 'Enregistrer' : 'Ajouter', handleSave));
    if (sheet.item) {
      footer.unshift(deleteButton('delete-preparation', 'Supprimer', () => onDeletePreparation(sheet.item.id)));
    }

    return (
      <MobileSheet
        open
        title={sheet.item ? 'Modifier une base' : 'Nouvelle base'}
        subtitle="Coût manuel aujourd’hui, détail matière à brancher ensuite."
        onClose={onClose}
        footer={footer}
      >
        <div className="form-grid">
          <label className="form-field">
            <span>Nom</span>
            <input value={form.name || ''} onChange={(event) => setField('name', event.target.value)} />
          </label>

          <label className="form-field">
            <span>Catégorie</span>
            <input value={form.category || ''} onChange={(event) => setField('category', event.target.value)} />
          </label>

          <label className="form-field form-field--full">
            <span>Coût / kg</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.manualCostPerKg || 0}
              onChange={(event) => setField('manualCostPerKg', event.target.value)}
            />
          </label>

          <label className="form-field form-field--full">
            <span>Notes</span>
            <textarea rows="3" value={form.notes || ''} onChange={(event) => setField('notes', event.target.value)} />
          </label>

          <label className="form-field form-field--full">
            <span>Détail futur</span>
            <textarea
              rows="4"
              value={form.futureRecipeDetails || ''}
              onChange={(event) => setField('futureRecipeDetails', event.target.value)}
            />
          </label>
        </div>
      </MobileSheet>
    );
  }

  if (sheet.kind === 'dessert') {
    const handleSave = () => {
      onSaveDessert(sheet.item?.id ?? null, {
        name: form.name.trim(),
        servings: Number(form.servings) || 0,
        sellPrice: Number(form.sellPrice) || 0,
      });
    };

    footer.push(submitButton('save-dessert', sheet.item ? 'Enregistrer' : 'Créer la fiche', handleSave));
    if (sheet.item) {
      footer.unshift(deleteButton('delete-dessert', 'Supprimer', () => onDeleteDessert(sheet.item.id)));
    }

    return (
      <MobileSheet
        open
        title={sheet.item ? 'Modifier la tarte' : 'Nouvelle tarte'}
        subtitle="Nom, prix de vente et nombre de parts."
        onClose={onClose}
        footer={footer}
      >
        <div className="form-grid">
          <label className="form-field form-field--full">
            <span>Nom</span>
            <input value={form.name || ''} onChange={(event) => setField('name', event.target.value)} />
          </label>

          <label className="form-field">
            <span>Parts</span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.servings || 0}
              onChange={(event) => setField('servings', event.target.value)}
            />
          </label>

          <label className="form-field">
            <span>Prix de vente</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.sellPrice || 0}
              onChange={(event) => setField('sellPrice', event.target.value)}
            />
          </label>
        </div>
      </MobileSheet>
    );
  }

  if (sheet.kind === 'line') {
    const handleSourceTypeChange = (value) => {
      const nextOptions = value === 'raw' ? rawIngredients : preparedComponents;
      setForm((current) => ({
        ...current,
        sourceType: value,
        sourceId: nextOptions[0]?.id ?? '',
      }));
    };

    const handleSave = () => {
      onSaveLine(sheet.dessertId, sheet.line?.id ?? null, {
        sourceType: form.sourceType,
        sourceId: form.sourceId,
        gramsOrUnits: Number(form.gramsOrUnits) || 0,
      });
    };

    footer.push(submitButton('save-line', sheet.line ? 'Enregistrer' : 'Ajouter la ligne', handleSave));
    if (sheet.line) {
      footer.unshift(deleteButton('delete-line', 'Supprimer', () => onDeleteLine(sheet.dessertId, sheet.line.id)));
    }

    return (
      <MobileSheet
        open
        title={sheet.line ? 'Modifier la ligne' : 'Ajouter un composant'}
        subtitle="Choisissez la source puis la quantité utilisée."
        onClose={onClose}
        footer={footer}
      >
        <div className="form-grid">
          <label className="form-field">
            <span>Type</span>
            <select value={form.sourceType || 'preparation'} onChange={(event) => handleSourceTypeChange(event.target.value)}>
              <option value="preparation">Base maison</option>
              <option value="raw">Achat brut</option>
            </select>
          </label>

          <label className="form-field">
            <span>Source</span>
            <select value={form.sourceId || ''} onChange={(event) => setField('sourceId', event.target.value)}>
              {sourceOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field form-field--full">
            <span>Quantité</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.gramsOrUnits || 0}
              onChange={(event) => setField('gramsOrUnits', event.target.value)}
            />
          </label>
        </div>
      </MobileSheet>
    );
  }

  const handleJournalSave = () => {
    onSaveJournalEntry(sheet.item?.id ?? null, {
      date: form.date,
      dessertId: form.dessertId,
      quantity: Number(form.quantity) || 0,
      totalRevenue: Number(form.totalRevenue) || 0,
    });
  };

  footer.push(submitButton('save-journal', sheet.item ? 'Enregistrer' : 'Ajouter la vente', handleJournalSave));
  if (sheet.item) {
    footer.unshift(deleteButton('delete-journal', 'Supprimer', () => onDeleteJournalEntry(sheet.item.id)));
  }

  return (
    <MobileSheet
      open
      title={sheet.item ? 'Modifier une vente' : 'Nouvelle vente'}
      subtitle="Une ligne simple pour alimenter les KPI."
      onClose={onClose}
      footer={footer}
    >
      <div className="form-grid">
        <label className="form-field">
          <span>Date</span>
          <input type="date" value={form.date || ''} onChange={(event) => setField('date', event.target.value)} />
        </label>

        <label className="form-field">
          <span>Tarte</span>
          <select value={form.dessertId || ''} onChange={(event) => setField('dessertId', event.target.value)}>
            {desserts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Quantité</span>
          <input
            type="number"
            min="1"
            step="1"
            value={form.quantity || 0}
            onChange={(event) => setField('quantity', event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Prix total encaissé</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.totalRevenue || 0}
            onChange={(event) => setField('totalRevenue', event.target.value)}
          />
        </label>
      </div>
    </MobileSheet>
  );
}

export default EditorSheet;
