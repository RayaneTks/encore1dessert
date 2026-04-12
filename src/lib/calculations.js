export function formatCurrency(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value || 0);
}

export function formatCompactCurrency(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function formatPercent(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function createSourceCatalog(rawIngredients, preparedComponents) {
  const entries = [
    ...rawIngredients.map((item) => ({
      key: `raw:${item.id}`,
      id: item.id,
      sourceType: 'raw',
      name: item.name,
      category: item.category,
      unit: item.pricingUnit,
      costPerReferenceUnit: item.normalizedUnitPrice,
      subtitle: item.purchaseLabel,
      notes: item.notes,
    })),
    ...preparedComponents.map((item) => ({
      key: `preparation:${item.id}`,
      id: item.id,
      sourceType: 'preparation',
      name: item.name,
      category: item.category,
      unit: 'kg',
      costPerReferenceUnit: item.manualCostPerKg,
      subtitle: `${formatCurrency(item.manualCostPerKg)} / kg`,
      notes: item.notes,
    })),
  ];

  return {
    entries,
    byKey: Object.fromEntries(entries.map((entry) => [entry.key, entry])),
  };
}

export function getUsageUnit(source) {
  if (!source) {
    return { label: 'g', hint: 'Quantité' };
  }

  if (source.sourceType === 'raw' && source.unit === 'L') {
    return { label: 'ml', hint: 'Volume' };
  }

  if (source.sourceType === 'raw' && source.unit === 'unit') {
    return { label: 'u', hint: 'Unités' };
  }

  return { label: 'g', hint: 'Poids' };
}

export function computeLineCost(line, catalog) {
  const source = catalog.byKey[`${line.sourceType}:${line.sourceId}`];
  if (!source) {
    return 0;
  }

  const amount = Number(line.gramsOrUnits) || 0;

  if (source.sourceType === 'raw') {
    if (source.unit === 'kg' || source.unit === 'L') {
      return source.costPerReferenceUnit * (amount / 1000);
    }

    if (source.unit === 'unit') {
      return source.costPerReferenceUnit * amount;
    }
  }

  return source.costPerReferenceUnit * (amount / 1000);
}

export function computeDessertMetrics(dessert, catalog) {
  const lines = dessert.lines.map((line) => {
    const source = catalog.byKey[`${line.sourceType}:${line.sourceId}`];
    const lineCost = computeLineCost(line, catalog);

    return {
      ...line,
      source,
      lineCost,
      usageUnit: getUsageUnit(source),
    };
  });

  const totalCost = lines.reduce((sum, line) => sum + line.lineCost, 0);
  const sellPrice = Number(dessert.sellPrice) || 0;
  const servings = Number(dessert.servings) || 0;
  const grossMargin = sellPrice - totalCost;
  const marginRate = sellPrice > 0 ? grossMargin / sellPrice : 0;

  return {
    ...dessert,
    lines,
    totalCost,
    sellPrice,
    servings,
    costPerServing: servings > 0 ? totalCost / servings : 0,
    grossMargin,
    marginRate,
  };
}

export function computeDessertsWithMetrics(desserts, catalog) {
  return desserts.map((dessert) => computeDessertMetrics(dessert, catalog));
}

export function computeAccountingMetrics(salesJournal, dessertsWithMetrics) {
  const dessertMap = Object.fromEntries(dessertsWithMetrics.map((dessert) => [dessert.id, dessert]));

  const entries = salesJournal
    .map((entry) => {
      const dessert = dessertMap[entry.dessertId];
      if (!dessert) {
        return null;
      }

      const quantity = Number(entry.quantity) || 0;
      const revenue = Number(entry.totalRevenue) || 0;
      const estimatedCost = dessert.totalCost * quantity;
      const estimatedProfit = revenue - estimatedCost;

      return {
        ...entry,
        quantity,
        totalRevenue: revenue,
        dessertName: dessert.name,
        estimatedCost,
        estimatedProfit,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.date.localeCompare(left.date));

  const totalRevenue = entries.reduce((sum, entry) => sum + entry.totalRevenue, 0);
  const totalEstimatedCost = entries.reduce((sum, entry) => sum + entry.estimatedCost, 0);
  const totalEstimatedProfit = entries.reduce((sum, entry) => sum + entry.estimatedProfit, 0);
  const totalQuantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);

  const topVolume = Array.from(
    entries.reduce((map, entry) => {
      const current = map.get(entry.dessertId) || { name: entry.dessertName, value: 0 };
      current.value += entry.quantity;
      map.set(entry.dessertId, current);
      return map;
    }, new Map()).values(),
  ).sort((left, right) => right.value - left.value)[0] || null;

  const topMargin = Array.from(
    entries.reduce((map, entry) => {
      const current = map.get(entry.dessertId) || { name: entry.dessertName, value: 0 };
      current.value += entry.estimatedProfit;
      map.set(entry.dessertId, current);
      return map;
    }, new Map()).values(),
  ).sort((left, right) => right.value - left.value)[0] || null;

  return {
    entries,
    totalRevenue,
    totalEstimatedCost,
    totalEstimatedProfit,
    totalQuantity,
    topVolume,
    topMargin,
  };
}
