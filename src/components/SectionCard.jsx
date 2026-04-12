function SectionCard({ title, subtitle, aside, children, tone = 'default', className = '' }) {
  return (
    <section className={`section-card section-card--${tone} ${className}`.trim()}>
      {(title || subtitle || aside) && (
        <div className="section-card__head">
          <div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {aside ? <div className="section-card__aside">{aside}</div> : null}
        </div>
      )}
      <div className="section-card__body">{children}</div>
    </section>
  );
}

export default SectionCard;
