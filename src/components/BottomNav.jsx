function BottomNav({ activeTab, items, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = activeTab === id;

        return (
          <button
            key={id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            className={`bottom-nav__item ${isActive ? 'is-active' : ''}`}
            onClick={() => onChange(id)}
          >
            <span className="bottom-nav__icon">
              <Icon size={18} strokeWidth={2.3} />
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
