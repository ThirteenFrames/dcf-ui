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