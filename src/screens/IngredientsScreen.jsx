import { useDeferredValue, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { formatCurrency } from '../lib/calculations';

function IngredientsScreen({ rawIngredients, onCreateIngredient, onEditIngredient }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const filteredIngredients = rawIngredients.filter((item) => {
    const needle = deferredQuery.trim().toLowerCase();
    return (
      item.name.toLowerCase().includes(needle) ||
      item.category.toLowerCase().includes(needle) ||
      item.purchaseLabel.toLowerCase().includes(needle)
    );
  });

  return (
    <div className="screen">
      <PageHeader
        eyebrow="Achats"
        title="Matières"
        meta={`${rawIngredients.length} références modifiables`}
        action={
          <button type="button" className="icon-button" onClick={onCreateIngredient} aria-label="Ajouter un achat">
            <Plus size={18} />
          </button>
        }
      />

      <div className="screen-body">
        <SectionCard className="search-card">
          <label className="search-input">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Chercher une matière première"
            />
          </label>
        </SectionCard>

        <SectionCard title="Tarifs" subtitle="Prix normalisés pour le calcul direct.">
          <div className="list-stack">
            {filteredIngredients.map((item) => (
              <button key={item.id} type="button" className="list-row" onClick={() => onEditIngredient(item)}>
                <div className="list-row__main">
                  <strong>{item.name}</strong>
                  <span>
                    {item.category} · {item.purchaseLabel}
                  </span>
                </div>

                <div className="list-row__metrics">
                  <span>{item.pricingUnit}</span>
                  <strong>{formatCurrency(item.normalizedUnitPrice)}</strong>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default IngredientsScreen;
