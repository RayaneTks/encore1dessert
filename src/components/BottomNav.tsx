import React from 'react';
import { motion, LayoutGroup } from 'motion/react';
import { LayoutDashboard, ChefHat, Calculator, Beaker, Apple } from 'lucide-react';
import { Tab } from '../types';

interface BottomNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: React.FC<any> }[] = [
  { id: 'history', label: 'Compta', icon: LayoutDashboard },
  { id: 'desserts', label: 'Recettes', icon: ChefHat },
  { id: 'calculate', label: 'Vendre', icon: Calculator },
  { id: 'bases', label: 'Bases', icon: Beaker },
  { id: 'ingredients', label: 'Matières', icon: Apple },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="nav-blur h-[84px] fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto px-2 flex justify-between items-start pt-3 z-[100] safe-area-bottom">
      <LayoutGroup>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex flex-col items-center gap-1 w-[20%] transition-colors duration-200 ${
              activeTab === tab.id ? 'text-gourmand-chocolate' : 'text-gourmand-biscuit'
            }`}
          >
            <motion.div
              animate={{
                scale: activeTab === tab.id ? 1.05 : 1,
                y: activeTab === tab.id ? -2 : 0,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            </motion.div>
            <span className={`text-[10px] font-medium tracking-tight transition-all duration-200 ${activeTab === tab.id ? 'opacity-100' : 'opacity-80'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </LayoutGroup>
    </nav>
  );
};
