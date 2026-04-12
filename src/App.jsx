import { useState } from 'react';
import './App.css';
import logo from './assets/logo.png';
import {
  appSettings,
  desserts,
  navigationItems,
  preparedComponents,
  rawIngredients,
} from './data/appData';
import BottomNav from './components/BottomNav';
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
      </div>
    </div>
  );
}

export default App;
