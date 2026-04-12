import { Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import {
  formatCompactCurrency,
  formatCurrency,
} from '../lib/calculations';

function AccountingScreen({ accounting, onCreateJournalEntry, onEditJournalEntry }) {
  return (
    <div className="screen">
      <PageHeader
        eyebrow="Compta"
        title="Journal"
        meta={`${accounting.entries.length} écritures`}
        action={
          <button type="button" className="icon-button" onClick={onCreateJournalEntry} aria-label="Ajouter une vente">
            <Plus size={18} />
          </button>
        }
      />

      <div className="screen-body">
        <SectionCard tone="hero" title="KPI" subtitle="Vision rapide du brut.">
          <div className="metric-grid">
            <div className="metric-card">
              <span>CA</span>
              <strong>{formatCompactCurrency(accounting.totalRevenue)}</strong>
            </div>
            <div className="metric-card">
              <span>Coût estimé</span>
              <strong>{formatCompactCurrency(accounting.totalEstimatedCost)}</strong>
            </div>
            <div className="metric-card">
              <span>Bénéfice brut</span>
              <strong>{formatCompactCurrency(accounting.totalEstimatedProfit)}</strong>
            </div>
            <div className="metric-card">
              <span>Tartes vendues</span>
              <strong>{accounting.totalQuantity}</strong>
            </div>
          </div>

          <div className="metric-grid metric-grid--secondary">
            <div className="metric-card metric-card--soft">
              <span>Top volume</span>
              <strong>{accounting.topVolume?.name ?? '—'}</strong>
              <small>{accounting.topVolume ? `${accounting.topVolume.value} vente(s)` : 'Aucune donnée'}</small>
            </div>
            <div className="metric-card metric-card--soft">
              <span>Top marge</span>
              <strong>{accounting.topMargin?.name ?? '—'}</strong>
              <small>{accounting.topMargin ? formatCurrency(accounting.topMargin.value) : 'Aucune donnée'}</small>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Écritures" subtitle="Date, quantité, encaissé.">
          <div className="list-stack">
            {accounting.entries.map((entry) => (
              <button key={entry.id} type="button" className="list-row" onClick={() => onEditJournalEntry(entry)}>
                <div className="list-row__main">
                  <strong>{entry.dessertName}</strong>
                  <span>
                    {entry.date} · {entry.quantity} vente(s)
                  </span>
                </div>

                <div className="list-row__metrics">
                  <span>{formatCurrency(entry.estimatedProfit)}</span>
                  <strong>{formatCurrency(entry.totalRevenue)}</strong>
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default AccountingScreen;
