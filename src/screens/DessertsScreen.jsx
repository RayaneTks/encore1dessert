import { ArrowUpRight, CircleDollarSign, Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';

function DessertsScreen({ data }) {
  const featuredDessert = data.desserts[0];

  return (
    <div className="screen">
      <PageHeader
        eyebrow="Desserts"
        title="Tartes"
        meta={`${data.desserts.length} fiches`}
        action={
          <button type="button" className="icon-button" aria-label="Créer un dessert">
            <Plus size={18} />
          </button>
        }
      />

      <div className="screen-body screen-body--list">
        <SectionCard tone="hero" className="feature-card">
          <div className="feature-card__top">
            <span className="badge">{featuredDessert.category}</span>
            <span className="value-pill">{featuredDessert.targetWeight} g</span>
          </div>

          <div className="feature-card__title">
            <h2>{featuredDessert.name}</h2>
            <p>{featuredDessert.servings} parts</p>
          </div>

          <div className="feature-card__metrics">
            <div>
              <span>Coût</span>
              <strong>{featuredDessert.estimatedCost.toFixed(2)} €</strong>
            </div>
            <div>
              <span>Vente</span>
              <strong>{featuredDessert.estimatedSellPrice.toFixed(2)} €</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Fiches" className="list-card">
          <div className="ledger-list">
            {data.desserts.map((dessert) => (
              <button key={dessert.id} type="button" className="ledger-row">
                <div className="ledger-row__main">
                  <strong>{dessert.name}</strong>
                  <span>{dessert.category}</span>
                </div>
                <div className="ledger-row__side">
                  <span>{dessert.targetWeight} g</span>
                  <strong>{dessert.estimatedSellPrice.toFixed(0)} €</strong>
                </div>
              </button>
            ))}
          </div>

          <div className="footer-strip">
            <div className="footer-strip__item">
              <CircleDollarSign size={15} />
              <span>Coût moyen 19 €</span>
            </div>
            <div className="footer-strip__item">
              <ArrowUpRight size={15} />
              <span>Prix moyen 40 €</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default DessertsScreen;
