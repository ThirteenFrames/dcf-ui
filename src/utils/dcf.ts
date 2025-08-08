import { DCFInputs, DCFResults, SensitivityData, DCFAPIResponse, CompanyMeta } from '../types/dcf';

// Defaults used when backend meta isn't available (raw currency units)
const DEFAULT_BASE_REVENUE = 1_000_000_000; // $1B revenue
const DEFAULT_SHARES_OUTSTANDING = 100_000_000; // 100M shares
const DEFAULT_MARKET_PRICE = 25;

export const sampleInputs: DCFInputs = {
  revenueCagr: 15, // 15% revenue growth
  ebitMargin: 25, // 25% EBIT margin
  taxRate: 21, // 21% tax rate
  capexPercent: 3, // 3% of revenue
  nwcPercent: 2, // 2% of revenue
  terminalGrowth: 3, // 3% terminal growth
  discountRate: 10, // 10% discount rate (WACC)
};

export type DCFCalcOptions = {
  baseRevenue?: number;
  sharesOutstanding?: number;
  marketPrice?: number;
  marketCap?: number;
  fcfLatest?: number;
  growthEstimate5Y?: number; // percent
  periodYears?: number;
  terminalRate?: number; // percent
  netDebt?: number; // enterprise to equity bridge
  daPercent?: number; // percent of revenue
  useMidYear?: boolean;
  wacc?: number; // percent
};

export function calculateDCF(inputs: DCFInputs, options: DCFCalcOptions = {}): DCFResults {
  const years = options.periodYears && options.periodYears > 0 ? options.periodYears : 5;
  const projectedFCFs: number[] = [];

  const useFcfPath = typeof options.fcfLatest === 'number' && typeof options.growthEstimate5Y === 'number';
  const marketPrice = options.marketPrice ?? DEFAULT_MARKET_PRICE;
  // Prefer provided sharesOutstanding when available; fallback to marketCap/price
  let shares = (options.sharesOutstanding && options.sharesOutstanding > 0)
    ? options.sharesOutstanding
    : ((options.marketCap && marketPrice > 0)
        ? options.marketCap / marketPrice
        : DEFAULT_SHARES_OUTSTANDING);
  const netDebt = options.netDebt ?? 0;
  const daPercent = (options.daPercent ?? 0) / 100;
  const useMidYear = Boolean(options.useMidYear);

  if (useFcfPath) {
    // FCF-based projection inspired by provided reference
    const growthRate = options.growthEstimate5Y! / 100;
    let fcf = options.fcfLatest!;
    for (let year = 1; year <= years; year++) {
      fcf = fcf * (1 + growthRate);
      projectedFCFs.push(fcf);
    }
    const terminalGrowth = (options.terminalRate ?? inputs.terminalGrowth) / 100;
    const discountRate = (options.wacc ?? inputs.discountRate) / 100;
    const terminalValue = projectedFCFs[projectedFCFs.length - 1] * (1 + terminalGrowth) / Math.max(discountRate - terminalGrowth, 0.02);

    // Discount to present value
    let pv = 0;
    for (let i = 0; i < projectedFCFs.length; i++) {
      const exp = useMidYear ? i + 0.5 : i + 1;
      pv += projectedFCFs[i] / Math.pow(1 + discountRate, exp);
    }
    pv += terminalValue / Math.pow(1 + discountRate, useMidYear ? years - 0.5 : years);

    const enterpriseValue = pv;
    const impliedMarketCap = enterpriseValue - netDebt; // include net debt bridge
    const intrinsicValue = shares > 0 ? impliedMarketCap / shares : 0;
    const marginOfSafety = marketPrice > 0 ? ((intrinsicValue - marketPrice) / marketPrice) * 100 : 0;

    return {
      intrinsicValue,
      enterpriseValue,
      impliedMarketCap,
      marginOfSafety,
      projectedFCFs,
    };
  }

  // Revenue-driven path (fallback)
  let currentRevenue = options.baseRevenue ?? DEFAULT_BASE_REVENUE;

  // Project 5 years of free cash flows
  for (let year = 1; year <= years; year++) {
    currentRevenue *= (1 + inputs.revenueCagr / 100);
    const ebit = currentRevenue * (inputs.ebitMargin / 100);
    const tax = ebit * (inputs.taxRate / 100);
    const nopat = ebit - tax;
    const da = currentRevenue * daPercent; // add-back
    const capex = currentRevenue * (inputs.capexPercent / 100);
    // Approximate ΔNWC ≈ NWC% * ΔRevenue
    const prevRevenue = currentRevenue / (1 + inputs.revenueCagr / 100);
    const deltaRevenue = currentRevenue - prevRevenue;
    const nwcChange = deltaRevenue * (inputs.nwcPercent / 100);
    const fcf = nopat + da - capex - nwcChange;
    projectedFCFs.push(fcf);
  }

  // Calculate terminal value
  const discountRate = (options.wacc ?? inputs.discountRate) / 100;
  const terminalFCF = projectedFCFs[years - 1] * (1 + inputs.terminalGrowth / 100);
  const discountMinusGrowth = discountRate - inputs.terminalGrowth / 100;
  const safeDenominator = Math.max(discountMinusGrowth, 0.001); // avoid div-by-zero or negative
  const terminalValue = terminalFCF / Math.max(safeDenominator, 0.02);

  // Discount to present value
  let pv = 0;
  for (let i = 0; i < projectedFCFs.length; i++) {
    const exp = useMidYear ? i + 0.5 : i + 1;
    pv += projectedFCFs[i] / Math.pow(1 + discountRate, exp);
  }
  pv += terminalValue / Math.pow(1 + discountRate, useMidYear ? years - 0.5 : years);

  const enterpriseValue = pv;
  const impliedMarketCap = enterpriseValue - netDebt;
  const intrinsicValue = shares > 0 ? impliedMarketCap / shares : 0;
  const marginOfSafety = marketPrice > 0 ? ((intrinsicValue - marketPrice) / marketPrice) * 100 : 0;

  return {
    intrinsicValue,
    enterpriseValue,
    impliedMarketCap,
    marginOfSafety,
    projectedFCFs,
  };
}

export function generateSensitivityData(baseInputs: DCFInputs, options: DCFCalcOptions = {}): SensitivityData {
  // Center around provided WACC if available
  const center = options.wacc ?? baseInputs.discountRate;
  const discountRates = [center - 2, center - 1, center, center + 1, center + 2].map(v => Math.round(v));
  const terminalGrowthRates = [1, 1.5, 2, 2.5, 3];
  const values: number[][] = [];

  // Ensure sensitivity varies with the provided grid values by ignoring fixed overrides
  const { wacc: _omitWacc, terminalRate: _omitTerminalRate, ...rest } = options;

  for (const dr of discountRates) {
    const row: number[] = [];
    for (const tg of terminalGrowthRates) {
      const inputs = { ...baseInputs, discountRate: dr, terminalGrowth: tg };
      const result = calculateDCF(inputs, rest);
      row.push(Math.round(result.intrinsicValue));
    }
    values.push(row);
  }

  return { discountRates, terminalGrowthRates, values };
}

export async function fetchDCFInputs(ticker: string): Promise<DCFAPIResponse> {
  const t = ticker.trim().toUpperCase();

  if (t === 'AAPL') {
    const response: DCFAPIResponse = {
      ticker: t,
      inputs: {
        revenueCagr: 7,
        ebitMargin: 30,
        taxRate: 18,
        capexPercent: 3,
        nwcPercent: 1.5,
        terminalGrowth: 3.0,
        discountRate: 9, // used when WACC not provided
      },
      meta: {
        price: 220.03,
        sharesOutstanding: 15_500_000_000,
        currency: 'USD',
        revenueLatest: 383_000_000_000,
        fcfLatest: 110_000_000_000,
        growthEstimate5Y: 6.5,
        periodYears: 5,
        terminalRate: 3.0,
        marketCap: 3_410_465_000_000,
        totalDebt: 110_000_000_000,
        cash: 162_000_000_000,
        netDebt: -52_000_000_000,
        beta: 1.2,
        riskFreeRate: 0.04,
        marketRiskPremium: 0.055,
        wacc: 0.065,
        daPercent: 3,
      },
    };
    return Promise.resolve(response);
  }

  // Fallback mock for non-AAPL tickers
  const fallback: DCFAPIResponse = {
    ticker: t,
    inputs: sampleInputs,
    meta: {
      price: DEFAULT_MARKET_PRICE,
      sharesOutstanding: DEFAULT_SHARES_OUTSTANDING,
      currency: 'USD',
      marketCap: DEFAULT_MARKET_PRICE * DEFAULT_SHARES_OUTSTANDING,
      periodYears: 5,
      terminalRate: 2.5,
      daPercent: 0,
    },
  };
  return Promise.resolve(fallback);
}