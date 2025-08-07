import { DCFInputs, DCFResults, SensitivityData } from '../types/dcf';

// Sample company data (placeholder for real API integration)
const BASE_REVENUE = 1000; // $1B revenue
const SHARES_OUTSTANDING = 100; // 100M shares
const SAMPLE_MARKET_PRICE = 25;

export const sampleInputs: DCFInputs = {
  revenueCagr: 15, // 15% revenue growth
  ebitMargin: 25, // 25% EBIT margin
  taxRate: 21, // 21% tax rate
  capexPercent: 3, // 3% of revenue
  nwcPercent: 2, // 2% of revenue
  terminalGrowth: 3, // 3% terminal growth
  discountRate: 10, // 10% discount rate (WACC)
};

export function calculateDCF(inputs: DCFInputs): DCFResults {
  const years = 5;
  const projectedFCFs: number[] = [];
  let currentRevenue = BASE_REVENUE;

  // Project 5 years of free cash flows
  for (let year = 1; year <= years; year++) {
    currentRevenue *= (1 + inputs.revenueCagr / 100);
    const ebit = currentRevenue * (inputs.ebitMargin / 100);
    const tax = ebit * (inputs.taxRate / 100);
    const nopat = ebit - tax;
    const capex = currentRevenue * (inputs.capexPercent / 100);
    const nwcChange = currentRevenue * (inputs.nwcPercent / 100) * (inputs.revenueCagr / 100);
    const fcf = nopat - capex - nwcChange;
    projectedFCFs.push(fcf);
  }

  // Calculate terminal value
  const terminalFCF = projectedFCFs[years - 1] * (1 + inputs.terminalGrowth / 100);
  const discountMinusGrowth = (inputs.discountRate - inputs.terminalGrowth) / 100;
  const safeDenominator = Math.max(discountMinusGrowth, 0.001); // avoid div-by-zero or negative
  const terminalValue = terminalFCF / safeDenominator;

  // Discount to present value
  let pv = 0;
  for (let i = 0; i < projectedFCFs.length; i++) {
    pv += projectedFCFs[i] / Math.pow(1 + inputs.discountRate / 100, i + 1);
  }
  pv += terminalValue / Math.pow(1 + inputs.discountRate / 100, years);

  const enterpriseValue = pv;
  const impliedMarketCap = enterpriseValue; // Assuming no net debt
  const intrinsicValue = impliedMarketCap / SHARES_OUTSTANDING;
  const marginOfSafety = ((intrinsicValue - SAMPLE_MARKET_PRICE) / SAMPLE_MARKET_PRICE) * 100;

  return {
    intrinsicValue,
    enterpriseValue,
    impliedMarketCap,
    marginOfSafety,
    projectedFCFs,
  };
}

export function generateSensitivityData(baseInputs: DCFInputs): SensitivityData {
  const discountRates = [8, 9, 10, 11, 12];
  const terminalGrowthRates = [1, 2, 3, 4, 5];
  const values: number[][] = [];

  for (const dr of discountRates) {
    const row: number[] = [];
    for (const tg of terminalGrowthRates) {
      const inputs = { ...baseInputs, discountRate: dr, terminalGrowth: tg };
      const result = calculateDCF(inputs);
      row.push(Math.round(result.intrinsicValue));
    }
    values.push(row);
  }

  return { discountRates, terminalGrowthRates, values };
}

// TODO: Replace with real API integration
// export async function fetchCompanyData(ticker: string) {
//   const response = await fetch(`/api/company/${ticker}`);
//   return response.json();
// }