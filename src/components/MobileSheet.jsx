import { X } from 'lucide-react';

function MobileSheet({ open, title, subtitle, onClose, children, footer }) {
  if (!open) {
    return null;
  }

  return (
    <div className="sheet-layer" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <button type="button" className="sheet-layer__backdrop" aria-label="Fermer" onClick={onClose} />
      <div className="sheet-panel">
        <div className="sheet-panel__handle" aria-hidden="true" />
        <div className="sheet-panel__head">
          <div>
            <h2 id="sheet-title">{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-button icon-button--soft" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="sheet-panel__body">{children}</div>
        {footer ? <div className="sheet-panel__footer">{footer}</div> : null}
      </div>
    </div>
  );
}

export default MobileSheet;
