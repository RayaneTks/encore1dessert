import { PlusSquare, Share, Smartphone } from 'lucide-react';

function InstallGate({ appleIcon, isIos, isStandalone }) {
  if (isStandalone) {
    return null;
  }

  return (
    <div className="install-gate" role="dialog" aria-modal="true" aria-labelledby="install-gate-title">
      <div className="install-gate__backdrop" />

      <div className="install-gate__sheet">
        <div className="install-gate__brand">
          <img src={appleIcon} alt="" />
          <div>
            <strong>Encore1Dessert</strong>
            <span>mode app requis</span>
          </div>
        </div>

        <div className="install-gate__copy">
          <p className="install-gate__eyebrow">Installation</p>
          <h1 id="install-gate-title">Ajoutez l’app à l’écran d’accueil</h1>
          <p>
            L’usage prévu est en PWA iPhone. La version navigateur reste bloquée pour garder une vraie
            sensation d’app et éviter une mise en page dégradée.
          </p>
        </div>

        {isIos ? (
          <div className="install-gate__steps">
            <div className="install-step">
              <span>1</span>
              <div>
                <strong>Partager dans Safari</strong>
                <p>
                  Touchez <Share size={14} /> dans la barre Safari.
                </p>
              </div>
            </div>
            <div className="install-step">
              <span>2</span>
              <div>
                <strong>Ajouter à l’écran d’accueil</strong>
                <p>
                  Choisissez <PlusSquare size={14} /> puis validez.
                </p>
              </div>
            </div>
            <div className="install-step">
              <span>3</span>
              <div>
                <strong>Ouvrir Encore1Dessert</strong>
                <p>Relancez ensuite l’app depuis son icône.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="install-gate__fallback">
            <Smartphone size={18} />
            <p>Ouvrez ce lien dans Safari sur iPhone, puis ajoutez l’app à l’écran d’accueil.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default InstallGate;
