import { ChevronRight, Plus, Scale, Sparkles, WalletCards } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';

function CalculateScreen({ data }) {
  const spotlight = data.desserts[1];

  return (
    <div className="screen">
      <PageHeader
        eyebrow="Encore1Dessert"
        title="Calcul"
        meta="Poids, coût, prix."
        logo={data.logo}
      />

      <div className="screen-body screen-body--calculate">
        <SectionCard tone="hero" className="hero-panel">
          <div className="hero-panel__chips">
            <span className="badge badge--accent">Principal</span>
            <span className="badge">{spotlight.servings} parts</span>
          </div>

          <div className="hero-panel__headline">
            <h2>{spotlight.name}</h2>
            <p>{spotlight.category}</p>
          </div>

          <div className="hero-panel__fields">
            <div className="field-tile">
              <Scale size={15} />
              <span>Poids</span>
              <strong>{spotlight.targetWeight} g</strong>
            </div>
            <div className="field-tile">
              <WalletCards size={15} />
              <span>Parts</span>
              <strong>{spotlight.servings}</strong>
            </div>
          </div>

          <div className="hero-panel__total">
            <div>
              <span>Coût estimé</span>
              <strong>{spotlight.estimatedCost.toFixed(2)} €</strong>
            </div>
            <small>Prix cible {spotlight.estimatedSellPrice.toFixed(2)} €</small>
          </div>

          <div className="hero-panel__actions">
            <button type="button" className="btn-primary">
              Calculer
            </button>
            <button type="button" className="btn-ghost">
              Ajouter une base
            </button>
          </div>
        </SectionCard>

        <div className="split-stack">
          <SectionCard title="Sources" className="compact-card">
            <div className="source-list">
              <div className="source-row">
                <span>Achats</span>
                <strong>{data.rawIngredients.length}</strong>
              </div>
              <div className="source-row">
                <span>Bases maison</span>
                <strong>{data.preparedComponents.length}</strong>
              </div>
              <div className="source-row">
                <span>Desserts</span>
                <strong>{data.desserts.length}</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="À brancher" className="compact-card">
            <div className="action-list">
              <button type="button" className="line-action">
                <span className="line-action__label">
                  <Sparkles size={15} />
                  Marge
                </span>
                <ChevronRight size={16} />
              </button>
              <button type="button" className="line-action">
                <span className="line-action__label">
                  <Plus size={15} />
                  Emballage
                </span>
                <ChevronRight size={16} />
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export default CalculateScreen;
