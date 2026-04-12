import { Share, PlusSquare, Smartphone, ArrowRight } from 'lucide-react';

function InstallGate({ appleIcon, isIos, isStandalone }) {
  if (isStandalone) {
    return null;
  }

  return (
    <div className="install-gate" role="dialog" aria-modal="true" aria-labelledby="install-gate-title">
      <div className="install-gate__backdrop" />
      <div className="install-gate__sheet">
        <div className="install-gate__badge">
          <img src={appleIcon} alt="" />
          <span>Encore1Dessert</span>
        </div>

        <div className="install-gate__copy">
          <p className="install-gate__eyebrow">Acces app uniquement</p>
          <h1 id="install-gate-title">Ajoutez l'app a l'ecran d'accueil</h1>
          <p className="install-gate__text">
            Cette version navigateur est bloquee. L'utilisation est prevue en mode application pour
            retrouver une vraie experience iPhone.
          </p>
        </div>

        {isIos ? (
          <div className="install-gate__steps">
            <div className="install-step">
              <span className="install-step__index">1</span>
              <div className="install-step__body">
                <strong>Ouvrez le menu de partage</strong>
                <p>
                  Touchez <Share size={15} /> dans Safari.
                </p>
              </div>
            </div>
            <div className="install-step">
              <span className="install-step__index">2</span>
              <div className="install-step__body">
                <strong>Choisissez Ajouter a l'ecran d'accueil</strong>
                <p>
                  Cherchez l'option <PlusSquare size={15} /> puis validez.
                </p>
              </div>
            </div>
            <div className="install-step">
              <span className="install-step__index">3</span>
              <div className="install-step__body">
                <strong>Ouvrez l'icone Encore1Dessert</strong>
                <p>
                  Lancez ensuite l'app depuis l'ecran d'accueil <ArrowRight size={15} />.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="install-gate__fallback">
            <Smartphone size={18} />
            <p>Ouvrez ce lien dans Safari sur iPhone puis ajoutez l'app a l'ecran d'accueil.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default InstallGate;
