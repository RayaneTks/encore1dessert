import { useDeferredValue, useState } from 'react';
import { ArrowUpRight, Plus, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import { formatCurrency, formatPercent } from '../lib/calculations';

function DessertsScreen({ desserts, activeDessertId, onOpenDessert, onSelectDessert, onCreateDessert }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const filteredDesserts = desserts.filter((dessert) =>
    dessert.name.toLowerCase().includes(deferredQuery.trim().toLowerCase()),
  );

  return (
    <div className="screen">
      <PageHeader
        eyebrow="Tartes"
        title="Catalogue"
        meta={`${desserts.length} fiches actives`}
        action={
          <button type="button" className="icon-button" onClick={onCreateDessert} aria-label="Ajouter une tarte">
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
              placeholder="Chercher une tarte"
            />
          </label>
        </SectionCard>

        <SectionCard title="Fiches" subtitle="Touchez une ligne pour ouvrir le calculateur.">
          <div className="list-stack">
            {filteredDesserts.map((dessert) => (
              <article key={dessert.id} className={`list-row ${dessert.id === activeDessertId ? 'is-active' : ''}`}>
                <button type="button" className="list-row__hit" onClick={() => onSelectDessert(dessert.id)}>
                  <div className="list-row__main">
                    <strong>{dessert.name}</strong>
                    <span>
                      {dessert.servings} parts · {dessert.lines.length} composants
                    </span>
                  </div>

                  <div className="list-row__metrics">
                    <span>{formatCurrency(dessert.totalCost)}</span>
                    <strong>{formatCurrency(dessert.sellPrice)}</strong>
                  </div>

                  <div className="list-row__aside">
                    <span>{formatPercent(dessert.marginRate)}</span>
                  </div>
                </button>

                <button type="button" className="ghost-inline ghost-inline--compact" onClick={() => onOpenDessert(dessert)}>
                  Modifier
                  <ArrowUpRight size={14} />
                </button>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default DessertsScreen;
