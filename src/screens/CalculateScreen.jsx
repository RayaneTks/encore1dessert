import {
  ChevronRight,
  PencilLine,
  Plus,
  ReceiptText,
  Trash2,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import {
  formatCompactCurrency,
  formatCurrency,
  formatPercent,
} from '../lib/calculations';

function CalculateScreen({
  accounting,
  counts,
  logo,
  selectedDessert,
  desserts,
  onSelectDessert,
  onOpenDessert,
  onUpdateDessert,
  onOpenLine,
  onUpdateLineAmount,
  onRemoveLine,
  onOpenJournal,
  onGoToTab,
}) {
  if (!selectedDessert) {
    return null;
  }

  const latestSale = accounting.entries[0];

  return (
    <div className="screen">
      <PageHeader
        eyebrow="Encore1Dessert"
        title="Calcul"
        meta="Coût instantané par tarte"
        logo={logo}
        action={
          <button type="button" className="icon-button" onClick={() => onOpenDessert(selectedDessert)}>
            <PencilLine size={18} />
          </button>
        }
      />

      <div className="screen-body">
        <div className="pill-scroll" aria-label="Sélection des tartes">
          {desserts.map((dessert) => (
            <button
              key={dessert.id}
              type="button"
              className={`pill-chip ${dessert.id === selectedDessert.id ? 'is-active' : ''}`}
              onClick={() => onSelectDessert(dessert.id)}
            >
              <span>{dessert.name}</span>
              <small>{formatCompactCurrency(dessert.totalCost)}</small>
            </button>
          ))}
        </div>

        <SectionCard
          tone="hero"
          className="summary-card"
          title={selectedDessert.name}
          subtitle={`${selectedDessert.lines.length} composants · ${selectedDessert.servings} parts`}
          action={
            <button type="button" className="ghost-inline" onClick={() => onOpenDessert(selectedDessert)}>
              Fiche
              <ChevronRight size={15} />
            </button>
          }
        >
          <div className="summary-hero">
            <div className="summary-hero__cost">
              <span>Coût de revient</span>
              <strong>{formatCurrency(selectedDessert.totalCost)}</strong>
            </div>
            <div className="summary-hero__mini">
              <label className="mini-input">
                <span>Vente</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={selectedDessert.sellPrice}
                  onChange={(event) =>
                    onUpdateDessert(selectedDessert.id, { sellPrice: Number(event.target.value) || 0 })
                  }
                />
              </label>
              <label className="mini-input">
                <span>Parts</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={selectedDessert.servings}
                  onChange={(event) =>
                    onUpdateDessert(selectedDessert.id, { servings: Number(event.target.value) || 0 })
                  }
                />
              </label>
            </div>
          </div>

          <div className="metric-grid metric-grid--summary">
            <div className="metric-card">
              <span>Coût / part</span>
              <strong>{formatCurrency(selectedDessert.costPerServing)}</strong>
            </div>
            <div className="metric-card">
              <span>Marge brute</span>
              <strong>{formatCurrency(selectedDessert.grossMargin)}</strong>
            </div>
            <div className="metric-card">
              <span>Taux</span>
              <strong>{formatPercent(selectedDessert.marginRate)}</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Composition"
          subtitle="Modifiez les quantités directement."
          action={
            <button type="button" className="ghost-inline" onClick={() => onOpenLine(selectedDessert.id)}>
              <Plus size={16} />
              Ligne
            </button>
          }
        >
          <div className="line-list">
            {selectedDessert.lines.map((line) => (
              <article key={line.id} className="line-item">
                <button type="button" className="line-item__main" onClick={() => onOpenLine(selectedDessert.id, line)}>
                  <div className="line-item__copy">
                    <div className="line-item__title">
                      <strong>{line.source?.name ?? 'Source supprimée'}</strong>
                      <span className={`tag ${line.sourceType === 'raw' ? 'tag--raw' : 'tag--prep'}`}>
                        {line.sourceType === 'raw' ? 'achat' : 'base'}
                      </span>
                    </div>
                    <span>{line.source?.subtitle ?? 'Référence indisponible'}</span>
                  </div>
                </button>

                <div className="line-item__side">
                  <label className="quantity-pill">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.gramsOrUnits}
                      onChange={(event) =>
                        onUpdateLineAmount(selectedDessert.id, line.id, Number(event.target.value) || 0)
                      }
                    />
                    <span>{line.usageUnit.label}</span>
                  </label>
                  <strong>{formatCurrency(line.lineCost)}</strong>
                  <button
                    type="button"
                    className="icon-button icon-button--ghost"
                    aria-label="Supprimer la ligne"
                    onClick={() => onRemoveLine(selectedDessert.id, line.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <div className="utility-grid">
          <SectionCard title="Références" subtitle="Sources actives">
            <div className="stats-stack">
              <button type="button" className="summary-row" onClick={() => onGoToTab('ingredients')}>
                <span>Achats</span>
                <strong>{counts.rawIngredients}</strong>
              </button>
              <button type="button" className="summary-row" onClick={() => onGoToTab('preparations')}>
                <span>Bases maison</span>
                <strong>{counts.preparedComponents}</strong>
              </button>
              <button type="button" className="summary-row" onClick={() => onGoToTab('desserts')}>
                <span>Fiches tartes</span>
                <strong>{counts.desserts}</strong>
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="Compta"
            subtitle={latestSale ? `Dernière vente ${latestSale.date}` : 'Journal vide'}
            action={
              <button type="button" className="ghost-inline" onClick={onOpenJournal}>
                <ReceiptText size={15} />
                Vente
              </button>
            }
          >
            <div className="stats-stack">
              <div className="summary-row summary-row--static">
                <span>Chiffre d’affaires</span>
                <strong>{formatCompactCurrency(accounting.totalRevenue)}</strong>
              </div>
              <div className="summary-row summary-row--static">
                <span>Bénéfice estimé</span>
                <strong>{formatCompactCurrency(accounting.totalEstimatedProfit)}</strong>
              </div>
              {latestSale ? (
                <button type="button" className="summary-row" onClick={() => onGoToTab('accounting')}>
                  <span>{latestSale.dessertName}</span>
                  <strong>{latestSale.quantity} vente(s)</strong>
                </button>
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export default CalculateScreen;
