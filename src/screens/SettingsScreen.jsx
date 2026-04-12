import { DatabaseZap, ShieldCheck, Sparkles } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';

function SettingsScreen({ data }) {
  const { appSettings } = data;

  return (
    <div className="screen">
      <PageHeader eyebrow="Réglages" title="App" meta="Local d'abord." />

      <div className="screen-body screen-body--settings">
        <SectionCard tone="hero" className="compact-card">
          <div className="settings-hero">
            <div className="settings-hero__item">
              <span>Devise</span>
              <strong>{appSettings.currency}</strong>
            </div>
            <div className="settings-hero__item">
              <span>Taxes</span>
              <strong>{appSettings.taxMode}</strong>
            </div>
            <div className="settings-hero__item">
              <span>Unités</span>
              <strong>{appSettings.units}</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Stockage" className="list-card">
          <div className="ledger-list">
            <div className="ledger-row ledger-row--static">
              <div className="ledger-row__main">
                <strong>Mode actuel</strong>
                <span>mock local</span>
              </div>
              <div className="ledger-row__side">
                <span className="badge badge--accent">actif</span>
              </div>
            </div>
            <div className="ledger-row ledger-row--static">
              <div className="ledger-row__main">
                <strong>Future DB</strong>
                <span>{appSettings.futureDatabaseConfigPlaceholder.driver}</span>
              </div>
              <div className="ledger-row__side">
                <DatabaseZap size={16} />
              </div>
            </div>
            <div className="ledger-row ledger-row--static">
              <div className="ledger-row__main">
                <strong>Back-office</strong>
                <span>{appSettings.futureDatabaseConfigPlaceholder.adminTool}</span>
              </div>
              <div className="ledger-row__side">
                <ShieldCheck size={16} />
              </div>
            </div>
          </div>

          <div className="footer-strip">
            <div className="footer-strip__item">
              <Sparkles size={15} />
              <span>Prêt pour brancher MySQL plus tard</span>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

export default SettingsScreen;
