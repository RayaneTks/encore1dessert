import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  Tab,
  RawIngredient,
  Base,
  Dessert,
  HistoryEntry,
  ToastData,
} from './types';
import {
  calculateDessertCost,
  createFullSnapshot,
} from './lib/calculations';
import {
  initialIngredients,
  initialBases,
  initialDesserts,
} from './data/initialData';

import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';

import { CalculateScreen } from './screens/CalculateScreen';
import { IngredientsScreen } from './screens/IngredientsScreen';
import { BasesScreen } from './screens/BasesScreen';
import { DessertsScreen } from './screens/DessertsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('calculate');
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // ─── State ─────────────────────────────────────────────────
  const [ingredients, setIngredients] = useState<RawIngredient[]>(() => {
    const saved = localStorage.getItem('e1d_ingredients_v2');
    return saved ? JSON.parse(saved) : initialIngredients;
  });

  const [bases, setBases] = useState<Base[]>(() => {
    const saved = localStorage.getItem('e1d_bases_v2');
    return saved ? JSON.parse(saved) : initialBases;
  });

  const [desserts, setDesserts] = useState<Dessert[]>(() => {
    const saved = localStorage.getItem('e1d_desserts_v2');
    return saved ? JSON.parse(saved) : initialDesserts;
  });

  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem('e1d_history_v2');
    return saved ? JSON.parse(saved) : [];
  });

  // ─── Persistence ───────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('e1d_ingredients_v2', JSON.stringify(ingredients));
  }, [ingredients]);

  useEffect(() => {
    localStorage.setItem('e1d_bases_v2', JSON.stringify(bases));
  }, [bases]);

  useEffect(() => {
    localStorage.setItem('e1d_desserts_v2', JSON.stringify(desserts));
  }, [desserts]);

  useEffect(() => {
    localStorage.setItem('e1d_history_v2', JSON.stringify(history));
  }, [history]);

  // ─── Toast ─────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ─── History Entry (with full immutable snapshot) ──────────
  const addHistoryEntry = useCallback((dessert: Dessert, quantity: number, overridePrice?: number) => {
    const unitCost = calculateDessertCost(dessert, ingredients, bases);
    const unitPrice = overridePrice || dessert.sellPrice;
    const totalRevenue = unitPrice * quantity;
    const totalCost = unitCost * quantity;
    const totalProfit = totalRevenue - totalCost;
    const marginRate = totalRevenue > 0 ? totalProfit / totalRevenue : 0;

    const entry: HistoryEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      dessertId: dessert.id,
      dessertName: dessert.name,
      dessertEmoji: dessert.emoji,
      quantitySold: quantity,
      unitCost,
      unitPrice,
      totalRevenue,
      totalCost,
      totalProfit,
      marginRate,
      linesSnapshot: createFullSnapshot(dessert, ingredients, bases),
    };
    setHistory(prev => [entry, ...prev]);
  }, [ingredients, bases]);

  return (
    <div className="app-container font-sans text-gourmand-chocolate selection:bg-gourmand-strawberry/10">
      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Screen content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'calculate' && (
            <CalculateScreen
              key="calculate"
              desserts={desserts}
              ingredients={ingredients}
              bases={bases}
              onValidate={addHistoryEntry}
              showToast={showToast}
            />
          )}
          {activeTab === 'desserts' && (
            <DessertsScreen
              key="desserts"
              desserts={desserts}
              ingredients={ingredients}
              bases={bases}
              setDesserts={setDesserts}
              showToast={showToast}
            />
          )}
          {activeTab === 'bases' && (
            <BasesScreen
              key="bases"
              bases={bases}
              ingredients={ingredients}
              setBases={setBases}
              showToast={showToast}
            />
          )}
          {activeTab === 'ingredients' && (
            <IngredientsScreen
              key="ingredients"
              ingredients={ingredients}
              setIngredients={setIngredients}
              showToast={showToast}
            />
          )}
          {activeTab === 'history' && (
            <HistoryScreen
              key="history"
              history={history}
              setHistory={setHistory}
              showToast={showToast}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsScreen
              key="settings"
              showToast={showToast}
            />
          )}
        </AnimatePresence>
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
