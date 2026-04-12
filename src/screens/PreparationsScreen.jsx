import { Beaker, Factory, Plus } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';

function PreparationsScreen({ data }) {
  return (
    <div className="screen">
      <PageHeader
        eyebrow="Bases"
        title="Maison"
        meta={`${data.preparedComponents.length} préparations`}
        action={
          <button type="button" className="icon-button" aria-label="Créer une base">
            <Plus size={18} />
          </button>
        }
      />

      <div className="screen-body screen-body--list">
        <SectionCard className="compact-card">
          <div className="compare-strip">
            <div className="compare-strip__item">
              <Factory size={15} />
              <span>Achat brut</span>
            </div>
            <div className="compare-strip__divider" />
            <div className="compare-strip__item compare-strip__item--active">
              <Beaker size={15} />
              <span>Fait maison</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Préparations" className="list-card">
          <div className="ledger-list">
            {data.preparedComponents.map((item) => (
              <button key={item.id} type="button" className="ledger-row">
                <div className="ledger-row__main">
                  <strong>{item.name}</strong>
                  <span>
                    {item.yieldQuantity} {item.yieldUnit}
                  </span>
                </div>
                <div className="ledger-row__side">
                  <span className={`badge ${item.status === 'Publié' ? 'badge--success' : 'badge--draft'}`}>
                    {item.status}
                  </span>
                  <strong>{item.estimatedCost.toFixed(2)} €</strong>
                </div>
              </button>
            ))}
          </div>

          <div className="footer-strip">
            <div className="footer-strip__item">
              <Beaker size={15} />
              <span>Caramel, pâte, praliné</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default PreparationsScreen;
