// Mock data for Footprint page
export const CATEGORY_META = {
  transport: { label: "Transport", color: "#2563eb" },
  electricity: { label: "Electricity", color: "#d97706" },
  food: { label: "Food & Diet", color: "#059669" },
  shopping: { label: "Shopping", color: "#7c3aed" },
  waste: { label: "Waste", color: "#db2777" },
} as const;

export function getMockData() {
  return {
    totalKgPerMonth: 127.6,
    comparisonToAverage: -36.2,
    confidenceScore: 72,
    calculatedAt: new Date().toISOString(),
    categories: [
      { category: "transport", totalKg: 39.7, percentage: 31.1, confidenceScore: 80, lineItems: [] },
      { category: "electricity", totalKg: 32.1, percentage: 25.1, confidenceScore: 90, lineItems: [] },
      { category: "food", totalKg: 28.0, percentage: 21.9, confidenceScore: 65, lineItems: [] },
      { category: "shopping", totalKg: 17.7, percentage: 13.9, confidenceScore: 50, lineItems: [] },
      { category: "waste", totalKg: 10.1, percentage: 7.9, confidenceScore: 55, lineItems: [] },
    ],
  };
}

export function buildCsv(data: any): string {
  const rows = ["Category,Line Item,Activity,Unit,Factor,Factor Unit,CO2e (kg),Source,Confidence"];
  data.categories.forEach((c: any) => {
    rows.push(`${CATEGORY_META[c.category as keyof typeof CATEGORY_META]?.label || c.category},,,,${c.totalKg},kg CO₂e,,`);
  });
  return rows.join("\n");
}
