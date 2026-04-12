import { createElement } from 'react';

function BottomNav({ activeTab, items, onChange }) {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {items.map((item) => {
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            className={`bottom-nav__item ${isActive ? 'is-active' : ''}`}
            onClick={() => onChange(item.id)}
          >
            <span className="bottom-nav__icon">
              {createElement(item.icon, { size: 18, strokeWidth: 2.3 })}
            </span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
