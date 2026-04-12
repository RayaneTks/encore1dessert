function SectionCard({ title, subtitle, action, tone = 'default', className = '', children }) {
  return (
    <section className={`section-card section-card--${tone} ${className}`.trim()}>
      {(title || subtitle || action) && (
        <div className="section-card__head">
          <div className="section-card__copy">
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {action ? <div className="section-card__action">{action}</div> : null}
        </div>
      )}

      <div className="section-card__body">{children}</div>
    </section>
  );
}

export default SectionCard;
