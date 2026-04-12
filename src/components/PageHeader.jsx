function PageHeader({ eyebrow, title, meta, action, logo }) {
  return (
    <header className={`page-header ${logo ? 'page-header--with-brand' : ''}`}>
      <div className="page-header__copy">
        {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
        <div className="page-header__row">
          <h1>{title}</h1>
          {action ? <div className="page-header__action">{action}</div> : null}
        </div>
        {meta ? <p className="page-header__meta">{meta}</p> : null}
      </div>

      {logo ? <img className="page-header__brand" src={logo} alt="Encore1Dessert" /> : null}
    </header>
  );
}

export default PageHeader;
