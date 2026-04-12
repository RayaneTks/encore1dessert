import { Calculator, Cookie, Croissant, PackageSearch, Settings2 } from 'lucide-react';

export const navigationItems = [
  { id: 'calculate', label: 'Calcul', icon: Calculator },
  { id: 'desserts', label: 'Tartes', icon: Croissant },
  { id: 'preparations', label: 'Bases', icon: Cookie },
  { id: 'ingredients', label: 'Achats', icon: PackageSearch },
  { id: 'settings', label: 'Réglages', icon: Settings2 },
];

export const rawIngredients = [
  {
    id: 'ing-butter',
    name: 'Beurre doux',
    category: 'Crèmerie',
    unitType: 'kg',
    defaultUnitPrice: 12.8,
    supplier: 'Métro',
    notes: 'Base pour pâtes et crèmes.',
  },
  {
    id: 'ing-flour',
    name: 'Farine T55',
    category: 'Épicerie',
    unitType: 'kg',
    defaultUnitPrice: 1.45,
    supplier: 'Transgourmet',
    notes: 'Référence pour fonds de tarte.',
  },
  {
    id: 'ing-almond',
    name: "Poudre d'amande",
    category: 'Fruits secs',
    unitType: 'kg',
    defaultUnitPrice: 13.9,
    supplier: 'Métro',
    notes: 'Utilisée pour crèmes et appareils.',
  },
  {
    id: 'ing-cream',
    name: 'Crème liquide 35%',
    category: 'Crèmerie',
    unitType: 'L',
    defaultUnitPrice: 5.7,
    supplier: 'Promocash',
    notes: 'Base de ganaches et mousses.',
  },
  {
    id: 'ing-milk-choc',
    name: 'Chocolat au lait',
    category: 'Chocolat',
    unitType: 'kg',
    defaultUnitPrice: 18.6,
    supplier: 'Valrhona',
    notes: 'Référence pour ganaches.',
  },
];

export const preparedComponents = [
  {
    id: 'prep-caramel',
    name: 'Caramel maison',
    category: 'Base sucrée',
    yieldQuantity: 1200,
    yieldUnit: 'g',
    estimatedCost: 9.8,
    ingredientRefs: ['ing-cream', 'ing-butter'],
    notes: 'Utilisé dans plusieurs tartes.',
    status: 'Publié',
  },
  {
    id: 'prep-pate',
    name: 'Pâte sucrée noisette',
    category: 'Fond de tarte',
    yieldQuantity: 8,
    yieldUnit: 'fonds',
    estimatedCost: 14.2,
    ingredientRefs: ['ing-butter', 'ing-flour', 'ing-almond'],
    notes: 'Version maison pour plusieurs formats.',
    status: 'Brouillon',
  },
  {
    id: 'prep-praline',
    name: 'Praliné cacahuète',
    category: 'Insert',
    yieldQuantity: 900,
    yieldUnit: 'g',
    estimatedCost: 11.4,
    ingredientRefs: ['ing-milk-choc'],
    notes: 'Base pour montages gourmands.',
    status: 'Publié',
  },
];

export const desserts = [
  {
    id: 'des-fraise',
    name: 'Tarte fraise vanille',
    category: 'Signature',
    targetWeight: 1250,
    servings: 8,
    estimatedCost: 18.6,
    estimatedSellPrice: 39,
    notes: 'Dessert final avec bases maison.',
  },
  {
    id: 'des-cacahuete',
    name: 'Tarte cacahuète caramel',
    category: 'Gourmande',
    targetWeight: 1350,
    servings: 8,
    estimatedCost: 21.4,
    estimatedSellPrice: 44,
    notes: 'Caramel maison et praliné.',
  },
  {
    id: 'des-tiramisu',
    name: 'Tarte tiramisu',
    category: 'Café',
    targetWeight: 1180,
    servings: 6,
    estimatedCost: 17.1,
    estimatedSellPrice: 36,
    notes: 'Version café.',
  },
];

export const appSettings = {
  currency: 'EUR',
  units: 'métrique',
  taxMode: 'TTC',
  futureDatabaseConfigPlaceholder: {
    driver: 'MySQL',
    adminTool: 'phpMyAdmin',
    status: 'Prévu',
  },
};
