export interface DCFInputs {
  revenueCagr: number;
  ebitMargin: number;
  taxRate: number;
  capexPercent: number;
  nwcPercent: number;
  terminalGrowth: number;
  discountRate: number;
}

export interface DCFResults {
  intrinsicValue: number;
  enterpriseValue: number;
  impliedMarketCap: number;
  marginOfSafety: number;
  projectedFCFs: number[];
}

export interface DCFModuleProps {
  ticker?: string;
  onValueChange?: (price: number) => void;
}

export interface SensitivityData {
  discountRates: number[];
  terminalGrowthRates: number[];
  values: number[][];
}

export interface CompanyMeta {
  price: number; // price of stock
  sharesOutstanding: number;
  currency: string;
  revenueLatest?: number;
  fcfLatest?: number;
  growthPercentEstimate5Y?: number; // % YoY next 5 years
  eps?: number;
  periodYears?: number;
  terminalRate?: number; // %
  // Valuation plumbing
  marketCap?: number;
  totalDebt?: number;
  cash?: number;
  netDebt?: number;
  beta?: number;
  riskFreeRate?: number;
  marketRiskPremium?: number;
  costOfEquity?: number;
  costOfDebt?: number;
  wacc?: number;
  daPercent?: number; // D&A, % of revenue
}

export interface DCFAPIResponse {
  ticker: string;
  inputs: DCFInputs;
  meta: CompanyMeta;
}