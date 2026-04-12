import { useDeferredValue, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { formatCurrency } from '../lib/calculations';

function PreparationsScreen({ preparedComponents, onCreatePreparation, onEditPreparation }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const filteredPreparations = preparedComponents.filter((item) => {
    const needle = deferredQuery.trim().toLowerCase();
    return (
      item.name.toLowerCase().includes(needle) ||
      item.category.toLowerCase().includes(needle) ||
      item.notes.toLowerCase().includes(needle)
    );
  });

  return (
    <div className="screen">
      <PageHeader
        eyebrow="Bases"
        title="Maison"
        meta={`${preparedComponents.length} coûts manuels prêts à détailler`}
        action={
          <button type="button" className="icon-button" onClick={onCreatePreparation} aria-label="Ajouter une base">
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
              placeholder="Chercher une base maison"
            />
          </label>
        </SectionCard>

        <SectionCard title="Préparations" subtitle="Le détail recette sera branché ensuite.">
          <div className="list-stack">
            {filteredPreparations.map((item) => (
              <button key={item.id} type="button" className="list-row" onClick={() => onEditPreparation(item)}>
                <div className="list-row__main">
                  <strong>{item.name}</strong>
                  <span>{item.futureRecipeDetails}</span>
                </div>

                <div className="list-row__metrics">
                  <span>{item.category}</span>
                  <strong>{formatCurrency(item.manualCostPerKg)}</strong>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default PreparationsScreen;
