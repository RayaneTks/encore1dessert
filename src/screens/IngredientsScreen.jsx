import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';

function IngredientsScreen({ data }) {
  return (
    <div className="screen">
      <PageHeader
        eyebrow="Achats"
        title="Matières"
        meta={`${data.rawIngredients.length} références`}
        action={
          <button type="button" className="icon-button" aria-label="Ajouter une matière première">
            <Plus size={18} />
          </button>
        }
      />

      <div className="screen-body screen-body--list">
        <SectionCard className="compact-card">
          <div className="search-shell">
            <div className="search-field">
              <Search size={15} />
              <span>Rechercher</span>
            </div>
            <button type="button" className="filter-button" aria-label="Filtres">
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Tarifs" className="list-card">
          <div className="ledger-list">
            {data.rawIngredients.map((ingredient) => (
              <button key={ingredient.id} type="button" className="ledger-row">
                <div className="ledger-row__main">
                  <strong>{ingredient.name}</strong>
                  <span>{ingredient.category}</span>
                </div>
                <div className="ledger-row__side">
                  <span>{ingredient.unitType}</span>
                  <strong>{ingredient.defaultUnitPrice.toFixed(2)} €</strong>
                </div>
              </button>
            ))}
          </div>

          <div className="footer-strip">
            <div className="footer-strip__item">
              <span>Beurre, farine, chocolat, crème, fruits secs</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default IngredientsScreen;
