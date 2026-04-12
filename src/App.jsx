import { useEffect, useMemo, useState } from 'react';
import './App.css';
import logo from './assets/logo.png';
import appleIcon from './assets/apple-touch-icon.png';
import {
  appSettings,
  desserts,
  navigationItems,
  preparedComponents,
  rawIngredients,
} from './data/appData';
import BottomNav from './components/BottomNav';
import InstallGate from './components/InstallGate';
import CalculateScreen from './screens/CalculateScreen';
import DessertsScreen from './screens/DessertsScreen';
import IngredientsScreen from './screens/IngredientsScreen';
import PreparationsScreen from './screens/PreparationsScreen';
import SettingsScreen from './screens/SettingsScreen';

const screens = {
  calculate: CalculateScreen,
  desserts: DessertsScreen,
  preparations: PreparationsScreen,
  ingredients: IngredientsScreen,
  settings: SettingsScreen,
};

function App() {
  const [activeTab, setActiveTab] = useState('calculate');
  const [isStandalone, setIsStandalone] = useState(false);

  const isLocal = useMemo(() => {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }, []);

  const isIos = useMemo(() => {
    const platform = window.navigator.userAgent;
    return /iPhone|iPad|iPod/i.test(platform);
  }, []);

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

  const Screen = screens[activeTab];
  const data = {
    logo,
    appSettings,
    desserts,
    preparedComponents,
    rawIngredients,
  };

  return (
    <div className="app-shell">
      <div className="app-frame">
        <div className="app-ornaments" aria-hidden="true">
          <div className="app-ornaments__blush" />
          <div className="app-ornaments__glow" />
        </div>

        <main className="app-main">
          <div key={activeTab} className="screen-shell">
            <Screen data={data} />
          </div>
        </main>

        <BottomNav activeTab={activeTab} items={navigationItems} onChange={setActiveTab} />
        <InstallGate appleIcon={appleIcon} isIos={isIos} isStandalone={isStandalone} />
      </div>
    </div>
  );
}

export default App;
