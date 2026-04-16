import React from 'react';
import { motion, LayoutGroup } from 'motion/react';
import { History, ChefHat, Calculator, Timer, ShoppingBasket } from 'lucide-react';
import { Tab } from '../types';

interface BottomNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: React.FC<any> }[] = [
  { id: 'history', label: 'Compta', icon: History },
  { id: 'desserts', label: 'Fiches', icon: ChefHat },
  { id: 'calculate', label: 'Vendre', icon: Calculator },
  { id: 'bases', label: 'Bases', icon: Timer },
  { id: 'ingredients', label: 'Achats', icon: ShoppingBasket },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="nav-blur h-[92px] fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto px-4 flex justify-between items-start pt-3 z-[100] safe-area-bottom">
      <LayoutGroup>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex flex-col items-center gap-1.5 w-[20%] transition-all duration-300 ${
              activeTab === tab.id ? 'text-gourmand-strawberry' : 'text-gourmand-cocoa/40'
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabMarker"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="absolute -top-3 w-1.5 h-1.5 rounded-full bg-gourmand-strawberry shadow-[0_0_8px_rgba(233,78,78,0.3)]"
              />
            )}
            <motion.div
              animate={{
                scale: activeTab === tab.id ? 1.15 : 1,
                y: activeTab === tab.id ? -1 : 0,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            </motion.div>
            <span className={`text-[9px] font-black uppercase tracking-wider transition-all duration-500 ${activeTab === tab.id ? 'opacity-100' : 'opacity-40'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </LayoutGroup>
    </nav>
  );
};
