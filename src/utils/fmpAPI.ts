import axios from 'axios';
import { DCFAPIResponse, DCFInputs, CompanyMeta } from '@/types/dcf';


export class DCFCalculator {
  private apiKey: string;
  private baseUrl: string = 'https://financialmodelingprep.com/stable/';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  public async getDCFValuation(ticker: string): Promise<DCFAPIResponse> {
    try {
      // Fetch all required data in parallel
      const [profile, income, balance, cashFlow, growth, dcf, keyMetrics] = await Promise.all([
        this.getCompanyProfile(ticker),
        this.getIncomeStatement(ticker),
        this.getBalanceSheet(ticker),
        this.getCashFlowStatement(ticker),
        this.getRevenueGrowthEstimates(ticker),
        this.getDCF(ticker),
        this.getKeyMetrics(ticker)
      ]);

      // Extract and calculate required values
      const inputs: DCFInputs = {
        revenueCagr: ((growth.revenueAvg / income.revenue) - 1) * 100, // same as growthPercentEstimate5Y
        ebitMargin: this.calculateEbitMargin(income) * 100,
        taxRate: this.calculateTaxRate(income) * 100,
        capexPercent: this.calculateCapexPercent(cashFlow, income),
        nwcPercent: this.calculateNWCPercent(balance, income),
        terminalGrowth: 2.5, // Typical 2.5% terminal growth
        discountRate: this.calculateDiscountRate(profile, income, balance) * 100
      };

      const meta: CompanyMeta = {
        price: profile.price,
        sharesOutstanding: profile.marketCap / profile.price,
        currency: profile.currency,
        revenueLatest: income.revenue,
        fcfLatest: cashFlow.freeCashFlow,
        growthPercentEstimate5Y: ((growth.revenueAvg / income.revenue) - 1) * 100,
        eps: income.eps,
        periodYears: 5, // Standard DCF period
        terminalRate: 2.5, // 2.5%
        marketCap: profile.marketCap,
        netDebt: balance.totalDebt - balance.cashAndShortTermInvestments,
        wacc: this.calculateWACC(profile.marketCap, balance.totalDebt, 
                               balance.cashAndShortTermInvestments, 
                               this.calculateCostOfEquity(profile.beta, 0.03, 0.055),
                               this.calculateCostOfDebt(income, balance),
                               this.calculateTaxRate(income)) * 100,
        daPercent: this.calculateDAPercent(cashFlow, income)
      };

      console.log("INPUTS")
      console.log(inputs)
      console.log("META")
      console.log(meta)

      return {
        ticker,
        inputs,
        meta
      };
    } catch (error) {
      console.error(`Error calculating DCF for ${ticker}:`, error);
      throw error;
    }
  }
  // Helper calculation methods
  private calculateEbitMargin(income: any): number {
    return income.operatingIncome / income.revenue;
  }

  private calculateTaxRate(income: any): number {
    return income.incomeTaxExpense / income.incomeBeforeTax;
  }

  private calculateCapexPercent(cashFlow: any, income: any): number {
    return Math.abs(cashFlow.capitalExpenditure) / income.revenue * 100;
  }

  private calculateNWCPercent(balance: any, income: any): number {
    const nwc = (balance.totalCurrentAssets - balance.cashAndShortTermInvestments) - 
                (balance.totalCurrentLiabilities - balance.shortTermDebt);
    return nwc / income.revenue * 100;
  }

  private calculateDiscountRate(profile: any, income: any, balance: any): number {
    // Use WACC if available, otherwise fall back to cost of equity
    return this.calculateWACC(profile.marketCap, balance.totalDebt, 
                               balance.cashAndShortTermInvestments, 
                               this.calculateCostOfEquity(profile.beta, 0.03, 0.055),
                               this.calculateCostOfDebt(income, balance),
                               this.calculateTaxRate(income));
  }

  private calculateCostOfEquity(beta: number, riskFreeRate: number, marketRiskPremium: number): number {
    return (riskFreeRate + beta * marketRiskPremium);
  }

  private calculateCostOfDebt(income: any, balance: any): number {
    return income.interestExpense / balance.totalDebt; 
  }

  private calculateWACC(marketCap: number, totalDebt: number, cash: number, 
                       costOfEquity: number, costOfDebt: number, taxRate: number): number {
    const equityValue = marketCap;
    const debtValue = totalDebt - cash;
    const totalValue = equityValue + debtValue;
    
    const equityWeight = equityValue / totalValue;
    const debtWeight = debtValue / totalValue;
    
    return ((equityWeight * costOfEquity) + (debtWeight * costOfDebt * (1 - taxRate)));
  }

  private calculateDAPercent(cashFlow: any, income: any): number {
    return ((cashFlow.depreciationAndAmortization || 0) / income.revenue) * 100;
  }

  // API Fetching methods
  private async getCompanyProfile(ticker: string): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/profile?symbol=${ticker}&limit=1&apikey=${this.apiKey}`);
    return response.data[0];
  }

  private async getIncomeStatement(ticker: string): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/income-statement?symbol=${ticker}&limit=1&apikey=${this.apiKey}`);
    return response.data[0];
  }

  private async getBalanceSheet(ticker: string): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/balance-sheet-statement?symbol=${ticker}&limit=1&apikey=${this.apiKey}`);
    return response.data[0];
  }

  private async getCashFlowStatement(ticker: string): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/cash-flow-statement?symbol=${ticker}&limit=1&apikey=${this.apiKey}`);
    return response.data[0];
  }

  private async getRevenueGrowthEstimates(ticker: string): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/analyst-estimates?symbol=${ticker}&period=annual&limit=1&apikey=${this.apiKey}`); // assumed this is a 5 year estimation
    return response.data[0];
  }

  private async getDCF(ticker: string): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/discounted-cash-flow?symbol=${ticker}&limit=1&apikey=${this.apiKey}`);
    return response.data[0];
  }

  private async getKeyMetrics(ticker: string): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/key-metrics?symbol=${ticker}&limit=1&apikey=${this.apiKey}`);
    return response.data[0];
  }
}
