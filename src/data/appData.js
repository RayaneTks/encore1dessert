import {
  Calculator,
  Croissant,
  PackageSearch,
  ReceiptText,
  Soup,
} from 'lucide-react';

export const navigationItems = [
  { id: 'calculate', label: 'Calcul', icon: Calculator },
  { id: 'desserts', label: 'Tartes', icon: Croissant },
  { id: 'preparations', label: 'Bases', icon: Soup },
  { id: 'ingredients', label: 'Achats', icon: PackageSearch },
  { id: 'accounting', label: 'Compta', icon: ReceiptText },
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

export const rawIngredients = [
  {
    id: 'ing-butter',
    name: 'Beurre',
    category: 'Crèmerie',
    pricingUnit: 'kg',
    normalizedUnitPrice: 9.96,
    purchaseLabel: '9,96 €/kg',
    notes: 'Plaquettes et cuisson.',
  },
  {
    id: 'ing-eggs',
    name: 'Œufs',
    category: 'Élevage',
    pricingUnit: 'unit',
    normalizedUnitPrice: 4.29 / 20,
    purchaseLabel: '4,29 € les 20',
    notes: 'Coût unitaire normalisé automatiquement.',
  },
  {
    id: 'ing-milk',
    name: 'Lait',
    category: 'Crèmerie',
    pricingUnit: 'L',
    normalizedUnitPrice: 0.92,
    purchaseLabel: '0,92 €/L',
    notes: 'Base liquide.',
  },
  {
    id: 'ing-heavy-cream',
    name: 'Crème liquide',
    category: 'Crèmerie',
    pricingUnit: 'L',
    normalizedUnitPrice: 3.99,
    purchaseLabel: '3,99 €/L',
    notes: '35% MG.',
  },
  {
    id: 'ing-hazelnut',
    name: 'Noisette',
    category: 'Fruits secs',
    pricingUnit: 'kg',
    normalizedUnitPrice: 6.98,
    purchaseLabel: '6,98 €/kg',
    notes: '',
  },
  {
    id: 'ing-almond',
    name: 'Amande',
    category: 'Fruits secs',
    pricingUnit: 'kg',
    normalizedUnitPrice: 11.38,
    purchaseLabel: '11,38 €/kg',
    notes: '',
  },
  {
    id: 'ing-almond-powder',
    name: "Poudre d'amande",
    category: 'Fruits secs',
    pricingUnit: 'kg',
    normalizedUnitPrice: 12.5,
    purchaseLabel: '12,50 €/kg',
    notes: '',
  },
  {
    id: 'ing-cornstarch',
    name: 'Maïzena',
    category: 'Épicerie',
    pricingUnit: 'kg',
    normalizedUnitPrice: 3.75,
    purchaseLabel: '3,75 €/kg',
    notes: '',
  },
  {
    id: 'ing-sugar',
    name: 'Sucre',
    category: 'Épicerie',
    pricingUnit: 'kg',
    normalizedUnitPrice: 0.87,
    purchaseLabel: '0,87 €/kg',
    notes: '',
  },
  {
    id: 'ing-icing-sugar',
    name: 'Sucre glace',
    category: 'Épicerie',
    pricingUnit: 'kg',
    normalizedUnitPrice: 3.79,
    purchaseLabel: '3,79 €/kg',
    notes: '',
  },
  {
    id: 'ing-flour',
    name: 'Farine',
    category: 'Épicerie',
    pricingUnit: 'kg',
    normalizedUnitPrice: 0.65,
    purchaseLabel: '0,65 €/kg',
    notes: 'T55 ou équivalent.',
  },
];

export const preparedComponents = [
  {
    id: 'prep-shortcrust',
    name: 'Pâte sucrée',
    category: 'Fond',
    manualCostPerKg: 4.53,
    notes: 'Coût manuel actuel.',
    futureRecipeDetails: 'Détail matières premières à brancher plus tard.',
  },
  {
    id: 'prep-caramel',
    name: 'Caramel beurre salé',
    category: 'Insert',
    manualCostPerKg: 3.69,
    notes: 'Base maison.',
    futureRecipeDetails: 'Composition détaillée à renseigner.',
  },
  {
    id: 'prep-milk-ganache',
    name: 'Ganache chocolat au lait',
    category: 'Ganache',
    manualCostPerKg: 5.48,
    notes: 'Coût manuel actuel.',
    futureRecipeDetails: 'Composition détaillée à renseigner.',
  },
  {
    id: 'prep-vanilla-ganache',
    name: 'Ganache vanille',
    category: 'Ganache',
    manualCostPerKg: 5.98,
    notes: 'Base crémeuse.',
    futureRecipeDetails: 'Composition détaillée à renseigner.',
  },
  {
    id: 'prep-red-berry',
    name: 'Coulis fruits rouges',
    category: 'Coulis',
    manualCostPerKg: 7.42,
    notes: '',
    futureRecipeDetails: 'Composition détaillée à renseigner.',
  },
  {
    id: 'prep-almond-cream',
    name: "Crème d'amande",
    category: 'Crème',
    manualCostPerKg: 6.93,
    notes: '',
    futureRecipeDetails: 'Composition détaillée à renseigner.',
  },
  {
    id: 'prep-peanut-coulis',
    name: 'Coulis beurre de cacahuète',
    category: 'Coulis',
    manualCostPerKg: 8.65,
    notes: '',
    futureRecipeDetails: 'Composition détaillée à renseigner.',
  },
];

export const desserts = [
  {
    id: 'dessert-peanut-caramel',
    name: 'Tarte cacahuète caramel',
    sellPrice: 44,
    servings: 8,
    lines: [
      { id: 'line-1', sourceType: 'preparation', sourceId: 'prep-shortcrust', gramsOrUnits: 180 },
      { id: 'line-2', sourceType: 'preparation', sourceId: 'prep-caramel', gramsOrUnits: 95 },
      { id: 'line-3', sourceType: 'preparation', sourceId: 'prep-vanilla-ganache', gramsOrUnits: 160 },
      { id: 'line-4', sourceType: 'preparation', sourceId: 'prep-peanut-coulis', gramsOrUnits: 130 },
      { id: 'line-5', sourceType: 'raw', sourceId: 'ing-almond', gramsOrUnits: 18 },
    ],
  },
  {
    id: 'dessert-milk-choc',
    name: 'Tarte chocolat lait',
    sellPrice: 42,
    servings: 8,
    lines: [
      { id: 'line-6', sourceType: 'preparation', sourceId: 'prep-shortcrust', gramsOrUnits: 180 },
      { id: 'line-7', sourceType: 'preparation', sourceId: 'prep-milk-ganache', gramsOrUnits: 240 },
      { id: 'line-8', sourceType: 'preparation', sourceId: 'prep-caramel', gramsOrUnits: 70 },
      { id: 'line-9', sourceType: 'raw', sourceId: 'ing-hazelnut', gramsOrUnits: 24 },
    ],
  },
  {
    id: 'dessert-red-berry',
    name: 'Tarte fruits rouges',
    sellPrice: 41,
    servings: 8,
    lines: [
      { id: 'line-10', sourceType: 'preparation', sourceId: 'prep-shortcrust', gramsOrUnits: 180 },
      { id: 'line-11', sourceType: 'preparation', sourceId: 'prep-almond-cream', gramsOrUnits: 125 },
      { id: 'line-12', sourceType: 'preparation', sourceId: 'prep-red-berry', gramsOrUnits: 115 },
      { id: 'line-13', sourceType: 'preparation', sourceId: 'prep-vanilla-ganache', gramsOrUnits: 90 },
    ],
  },
];

export const salesJournal = [
  {
    id: 'sale-1',
    date: '2026-04-11',
    dessertId: 'dessert-peanut-caramel',
    quantity: 2,
    totalRevenue: 88,
  },
  {
    id: 'sale-2',
    date: '2026-04-12',
    dessertId: 'dessert-milk-choc',
    quantity: 1,
    totalRevenue: 42,
  },
  {
    id: 'sale-3',
    date: '2026-04-13',
    dessertId: 'dessert-red-berry',
    quantity: 2,
    totalRevenue: 82,
  },
];

export const initialAppState = {
  appSettings,
  rawIngredients,
  preparedComponents,
  desserts,
  salesJournal,
};
