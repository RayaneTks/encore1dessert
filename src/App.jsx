import { startTransition, useEffect, useMemo, useState } from 'react';
import './App.css';
import logo from './assets/logo.png';
import appleIcon from './assets/apple-touch-icon.png';
import { initialAppState, navigationItems } from './data/appData';
import {
  computeAccountingMetrics,
  computeDessertsWithMetrics,
  createSourceCatalog,
} from './lib/calculations';
import BottomNav from './components/BottomNav';
import EditorSheet from './components/EditorSheet';
import InstallGate from './components/InstallGate';
import AccountingScreen from './screens/AccountingScreen';
import CalculateScreen from './screens/CalculateScreen';
import DessertsScreen from './screens/DessertsScreen';
import IngredientsScreen from './screens/IngredientsScreen';
import PreparationsScreen from './screens/PreparationsScreen';

const screens = {
  calculate: CalculateScreen,
  desserts: DessertsScreen,
  preparations: PreparationsScreen,
  ingredients: IngredientsScreen,
  accounting: AccountingScreen,
};

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function App() {
  const [appState, setAppState] = useState(initialAppState);
  const [activeTab, setActiveTab] = useState('calculate');
  const [activeDessertId, setActiveDessertId] = useState(initialAppState.desserts[0]?.id ?? null);
  const [sheet, setSheet] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

  const isLocal = useMemo(() => {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }, []);

  const isIos = useMemo(() => /iPhone|iPad|iPod/i.test(window.navigator.userAgent), []);

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)');
    const updateMode = () => {
      setIsStandalone(Boolean(window.navigator.standalone) || media.matches || isLocal);
    };

    updateMode();
    media.addEventListener('change', updateMode);
    window.addEventListener('focus', updateMode);

    return () => {
      media.removeEventListener('change', updateMode);
      window.removeEventListener('focus', updateMode);
    };
  }, [isLocal]);

  const sourceCatalog = useMemo(
    () => createSourceCatalog(appState.rawIngredients, appState.preparedComponents),
    [appState.preparedComponents, appState.rawIngredients],
  );

  const dessertsWithMetrics = useMemo(
    () => computeDessertsWithMetrics(appState.desserts, sourceCatalog),
    [appState.desserts, sourceCatalog],
  );

  const accounting = useMemo(
    () => computeAccountingMetrics(appState.salesJournal, dessertsWithMetrics),
    [appState.salesJournal, dessertsWithMetrics],
  );

  const selectedDessert = useMemo(
    () => dessertsWithMetrics.find((dessert) => dessert.id === activeDessertId) ?? dessertsWithMetrics[0] ?? null,
    [activeDessertId, dessertsWithMetrics],
  );

  const Screen = screens[activeTab];

  const counts = {
    rawIngredients: appState.rawIngredients.length,
    preparedComponents: appState.preparedComponents.length,
    desserts: appState.desserts.length,
  };

  const updateAppState = (updater) => {
    setAppState((current) => updater(current));
  };

  const openSheet = (kind, payload = {}) => setSheet({ kind, ...payload });
  const closeSheet = () => setSheet(null);

  const changeTab = (nextTab) => {
    startTransition(() => setActiveTab(nextTab));
  };

  const selectDessert = (dessertId) => {
    setActiveDessertId(dessertId);
  };

  const updateDessert = (dessertId, patch) => {
    updateAppState((current) => ({
      ...current,
      desserts: current.desserts.map((dessert) =>
        dessert.id === dessertId ? { ...dessert, ...patch } : dessert,
      ),
    }));
  };

  const saveIngredient = (ingredientId, payload) => {
    const nextId = ingredientId ?? createId('ing');

    updateAppState((current) => ({
      ...current,
      rawIngredients: ingredientId
        ? current.rawIngredients.map((item) => (item.id === ingredientId ? { ...item, ...payload } : item))
        : [...current.rawIngredients, { id: nextId, ...payload }],
    }));

    closeSheet();
  };

  const deleteIngredient = (ingredientId) => {
    updateAppState((current) => ({
      ...current,
      rawIngredients: current.rawIngredients.filter((item) => item.id !== ingredientId),
      desserts: current.desserts.map((dessert) => ({
        ...dessert,
        lines: dessert.lines.filter(
          (line) => !(line.sourceType === 'raw' && line.sourceId === ingredientId),
        ),
      })),
    }));

    closeSheet();
  };

  const savePreparation = (preparationId, payload) => {
    const nextId = preparationId ?? createId('prep');

    updateAppState((current) => ({
      ...current,
      preparedComponents: preparationId
        ? current.preparedComponents.map((item) =>
            item.id === preparationId ? { ...item, ...payload } : item,
          )
        : [...current.preparedComponents, { id: nextId, ...payload }],
    }));

    closeSheet();
  };

  const deletePreparation = (preparationId) => {
    updateAppState((current) => ({
      ...current,
      preparedComponents: current.preparedComponents.filter((item) => item.id !== preparationId),
      desserts: current.desserts.map((dessert) => ({
        ...dessert,
        lines: dessert.lines.filter(
          (line) => !(line.sourceType === 'preparation' && line.sourceId === preparationId),
        ),
      })),
    }));

    closeSheet();
  };

  const saveDessert = (dessertId, payload) => {
    const nextId = dessertId ?? createId('dessert');

    updateAppState((current) => ({
      ...current,
      desserts: dessertId
        ? current.desserts.map((item) => (item.id === dessertId ? { ...item, ...payload } : item))
        : [{ id: nextId, lines: [], ...payload }, ...current.desserts],
    }));

    setActiveDessertId(nextId);
    changeTab('calculate');
    closeSheet();
  };

  const deleteDessert = (dessertId) => {
    updateAppState((current) => {
      if (current.desserts.length <= 1) {
        return current;
      }

      const nextDesserts = current.desserts.filter((item) => item.id !== dessertId);
      setActiveDessertId(nextDesserts[0]?.id ?? null);

      return {
        ...current,
        desserts: nextDesserts,
        salesJournal: current.salesJournal.filter((entry) => entry.dessertId !== dessertId),
      };
    });

    closeSheet();
  };

  const saveLine = (dessertId, lineId, payload) => {
    const nextLineId = lineId ?? createId('line');

    updateAppState((current) => ({
      ...current,
      desserts: current.desserts.map((dessert) =>
        dessert.id !== dessertId
          ? dessert
          : {
              ...dessert,
              lines: lineId
                ? dessert.lines.map((line) => (line.id === lineId ? { ...line, ...payload } : line))
                : [...dessert.lines, { id: nextLineId, ...payload }],
            },
      ),
    }));

    closeSheet();
  };

  const updateLineAmount = (dessertId, lineId, amount) => {
    updateAppState((current) => ({
      ...current,
      desserts: current.desserts.map((dessert) =>
        dessert.id !== dessertId
          ? dessert
          : {
              ...dessert,
              lines: dessert.lines.map((line) =>
                line.id === lineId ? { ...line, gramsOrUnits: amount } : line,
              ),
            },
      ),
    }));
  };

  const deleteLine = (dessertId, lineId) => {
    updateAppState((current) => ({
      ...current,
      desserts: current.desserts.map((dessert) =>
        dessert.id !== dessertId
          ? dessert
          : {
              ...dessert,
              lines: dessert.lines.filter((line) => line.id !== lineId),
            },
      ),
    }));

    closeSheet();
  };

  const saveJournalEntry = (entryId, payload) => {
    const nextId = entryId ?? createId('sale');

    updateAppState((current) => ({
      ...current,
      salesJournal: entryId
        ? current.salesJournal.map((item) => (item.id === entryId ? { ...item, ...payload } : item))
        : [{ id: nextId, ...payload }, ...current.salesJournal],
    }));

    closeSheet();
  };

  const deleteJournalEntry = (entryId) => {
    updateAppState((current) => ({
      ...current,
      salesJournal: current.salesJournal.filter((item) => item.id !== entryId),
    }));

    closeSheet();
  };

  return (
    <div className="app-shell">
      <div className="app-frame">
        <div className="app-sheen" aria-hidden="true" />

        <main className="app-main">
          <div key={activeTab} className="screen-shell">
            <Screen
              accounting={accounting}
              activeDessertId={activeDessertId}
              counts={counts}
              desserts={dessertsWithMetrics}
              logo={logo}
              onCreateDessert={() => openSheet('dessert')}
              onCreateIngredient={() => openSheet('ingredient')}
              onCreateJournalEntry={() => openSheet('journal')}
              onCreatePreparation={() => openSheet('preparation')}
              onEditIngredient={(item) => openSheet('ingredient', { item })}
              onEditJournalEntry={(item) => openSheet('journal', { item })}
              onEditPreparation={(item) => openSheet('preparation', { item })}
              onGoToTab={changeTab}
              onOpenDessert={(item) => openSheet('dessert', { item })}
              onOpenJournal={() => openSheet('journal')}
              onOpenLine={(dessertId, line) => openSheet('line', { dessertId, line })}
              onRemoveLine={deleteLine}
              onSelectDessert={(dessertId) => {
                selectDessert(dessertId);
                if (activeTab !== 'calculate') {
                  changeTab('calculate');
                }
              }}
              onUpdateDessert={updateDessert}
              onUpdateLineAmount={updateLineAmount}
              preparedComponents={appState.preparedComponents}
              rawIngredients={appState.rawIngredients}
              selectedDessert={selectedDessert}
            />
          </div>
        </main>

        <BottomNav activeTab={activeTab} items={navigationItems} onChange={changeTab} />

        <EditorSheet
          key={
            sheet
              ? `${sheet.kind}-${sheet.item?.id ?? sheet.line?.id ?? sheet.dessertId ?? 'new'}`
              : 'sheet-empty'
          }
          desserts={appState.desserts}
          onClose={closeSheet}
          onDeleteDessert={deleteDessert}
          onDeleteIngredient={deleteIngredient}
          onDeleteJournalEntry={deleteJournalEntry}
          onDeleteLine={deleteLine}
          onDeletePreparation={deletePreparation}
          onSaveDessert={saveDessert}
          onSaveIngredient={saveIngredient}
          onSaveJournalEntry={saveJournalEntry}
          onSaveLine={saveLine}
          onSavePreparation={savePreparation}
          preparedComponents={appState.preparedComponents}
          rawIngredients={appState.rawIngredients}
          sheet={sheet}
        />

        <InstallGate appleIcon={appleIcon} isIos={isIos} isStandalone={isStandalone} />
      </div>
    </div>
  );
}

export default App;
