import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DCFInputs, DCFResults, DCFModuleProps } from '../types/dcf';
import { calculateDCF, sampleInputs, generateSensitivityData } from '../utils/dcf';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const DCFModule: React.FC<DCFModuleProps> = ({ ticker: initialTicker = 'SAMPLE', onValueChange }) => {
  const [ticker, setTicker] = useState(initialTicker);
  const [inputs, setInputs] = useState<DCFInputs>(sampleInputs);
  const [results, setResults] = useState<DCFResults>(calculateDCF(sampleInputs));
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const newResults = calculateDCF(inputs);
    setResults(newResults);
    onValueChange?.(newResults.intrinsicValue);

    // Animate the intrinsic value
    const start = animatedValue;
    const end = newResults.intrinsicValue;
    const duration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = start + (end - start) * easeOutQuart;
      
      setAnimatedValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [inputs, onValueChange]);

  const handleInputChange = (field: keyof DCFInputs, value: number) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const resetToSample = () => {
    setInputs(sampleInputs);
  };

  const sensitivityData = generateSensitivityData(inputs);
  
  const chartData = results.projectedFCFs.map((fcf, index) => ({
    year: `Y${index + 1}`,
    fcf: Math.round(fcf),
  }));

  const getValuationStatus = () => {
    const deviation = Math.abs(results.marginOfSafety);
    if (deviation < 15) return null;
    
    return results.marginOfSafety > 0 ? {
      label: 'UNDERVALUED',
      color: 'bg-accent-green/15 text-accent-green border-accent-green/30'
    } : {
      label: 'OVERVALUED', 
      color: 'bg-accent-red/15 text-accent-red border-accent-red/30'
    };
  };

  const valuationStatus = getValuationStatus();

  const InputField = ({ 
    label, 
    field, 
    value, 
    suffix = '%',
    tooltip 
  }: {
    label: string;
    field: keyof DCFInputs;
    value: number;
    suffix?: string;
    tooltip: string;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={field} className="text-sm font-medium text-text-primary">
          {label}
        </Label>
        <TooltipProvider>
          <UITooltip>
            <TooltipTrigger>
              <Info className="text-text-secondary" size={14} strokeWidth={1.5} />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{tooltip}</p>
            </TooltipContent>
          </UITooltip>
        </TooltipProvider>
      </div>
      <div className="relative">
        <Input
          id={field}
          type="number"
          step="0.1"
          value={value}
          onChange={(e) => handleInputChange(field, parseFloat(e.target.value) || 0)}
          className="pr-8 bg-bg-elevate border-border-subtle text-text-primary"
          aria-valuenow={value}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
          {suffix}
        </span>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-bg-space min-h-screen animate-fade-in">
      <style>{`
        .dcf-module {
          --bg-space: 201 52% 10%;
          --bg-elevate: 210 23% 16%;
          --border-subtle: 210 20% 21%;
          --text-primary: 217 27% 92%;
          --text-secondary: 218 11% 65%;
          --accent-green: 145 63% 42%;
          --accent-red: 4 86% 67%;
        }
        .bg-bg-space { background-color: hsl(var(--bg-space)); }
        .bg-bg-elevate { background-color: hsl(var(--bg-elevate)); }
        .border-border-subtle { border-color: hsl(var(--border-subtle)); }
        .text-text-primary { color: hsl(var(--text-primary)); }
        .text-text-secondary { color: hsl(var(--text-secondary)); }
        .text-accent-green { color: hsl(var(--accent-green)); }
        .text-accent-red { color: hsl(var(--accent-red)); }
        .bg-accent-green\\/15 { background-color: hsl(var(--accent-green) / 0.15); }
        .bg-accent-red\\/15 { background-color: hsl(var(--accent-red) / 0.15); }
        .border-accent-green\\/30 { border-color: hsl(var(--accent-green) / 0.3); }
        .border-accent-red\\/30 { border-color: hsl(var(--accent-red) / 0.3); }
      `}</style>

      <div className="dcf-module mb-8 text-center">
        <h1 className="text-3xl font-bold text-text-primary mb-2">
          DCF Valuation Module
        </h1>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Label htmlFor="ticker" className="text-text-secondary">Ticker:</Label>
          <Input
            id="ticker"
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            className="w-32 bg-bg-elevate border-border-subtle text-accent-green font-semibold text-center"
            placeholder="AAPL"
          />
        </div>
      </div>

      <div className="space-y-8">
        {/* Assumptions Card */}
         <div className="bg-bg-elevate rounded-2xl p-6 shadow-[0_0_24px_rgba(0,0,0,0.35)] border border-border-subtle animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary">Assumptions</h2>
            <Button 
              onClick={resetToSample}
              className="bg-accent-green hover:bg-accent-green/80 text-bg-space"
              size="sm"
            >
              Reset to Sample Data
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            <InputField
              label="Revenue CAGR"
              field="revenueCagr"
              value={inputs.revenueCagr}
              tooltip="Annual revenue growth rate"
            />
            <InputField
              label="EBIT Margin"
              field="ebitMargin"
              value={inputs.ebitMargin}
              tooltip="Earnings before interest and tax as % of revenue"
            />
            <InputField
              label="Tax Rate"
              field="taxRate"
              value={inputs.taxRate}
              tooltip="Corporate tax rate"
            />
            <InputField
              label="CapEx %"
              field="capexPercent"
              value={inputs.capexPercent}
              tooltip="Capital expenditure as % of revenue"
            />
            <InputField
              label="NWC %"
              field="nwcPercent"
              value={inputs.nwcPercent}
              tooltip="Net working capital as % of revenue"
            />
            <InputField
              label="Terminal Growth"
              field="terminalGrowth"
              value={inputs.terminalGrowth}
              tooltip="Long-term growth rate beyond forecast period"
            />
            <InputField
              label="Discount Rate"
              field="discountRate"
              value={inputs.discountRate}
              tooltip="Required rate of return (WACC)"
            />
          </div>
        </div>

        {/* Output Card */}
        <div className="bg-bg-elevate rounded-2xl p-6 shadow-[0_0_24px_rgba(0,0,0,0.35)] border border-border-subtle animate-fade-in">
          <div className="mb-6">
            <div className="rounded-2xl bg-accent-blue/12 border border-accent-blue/30 p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-text-secondary">Intrinsic Value / Share</h2>
                {valuationStatus && (
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${valuationStatus.color}`}>
                    {valuationStatus.label}
                  </span>
                )}
              </div>
              <div className="text-5xl md:text-6xl font-bold text-text-primary leading-tight">
                ${animatedValue.toFixed(2)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mt-4">
              <div>
                <div className="text-text-secondary">Enterprise Value</div>
                <div className="text-text-primary font-semibold">
                  ${(results.enterpriseValue / 1000).toFixed(1)}B
                </div>
              </div>
              <div>
                <div className="text-text-secondary">Market Cap</div>
                <div className="text-text-primary font-semibold">
                  ${(results.impliedMarketCap / 1000).toFixed(1)}B
                </div>
              </div>
              <div>
                <div className="text-text-secondary">Margin of Safety</div>
                <div className={`font-semibold ${results.marginOfSafety >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {results.marginOfSafety.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="dcf" className="w-full">
            <TabsList className="w-full rounded-full p-1 border border-border-subtle bg-bg-space">
              <TabsTrigger value="dcf" className="rounded-full text-text-secondary data-[state=active]:text-text-primary data-[state=active]:bg-bg-elevate px-4 py-2">DCF</TabsTrigger>
              <TabsTrigger value="sensitivity" className="rounded-full text-text-secondary data-[state=active]:text-text-primary data-[state=active]:bg-bg-elevate px-4 py-2">Sensitivity</TabsTrigger>
              <TabsTrigger value="notes" className="rounded-full text-text-secondary data-[state=active]:text-text-primary data-[state=active]:bg-bg-elevate px-4 py-2">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="dcf" className="mt-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                    <XAxis dataKey="year" stroke="hsl(var(--text-secondary))" />
                    <YAxis stroke="hsl(var(--text-secondary))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--bg-space))', 
                        border: '1px solid hsl(var(--border-subtle))',
                        borderRadius: '8px',
                        color: 'hsl(var(--text-primary))'
                      }}
                    />
                    <Bar dataKey="fcf" fill="hsl(var(--accent-green))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="sensitivity" className="mt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-text-secondary text-left p-2">Discount Rate</th>
                      {sensitivityData.terminalGrowthRates.map(rate => (
                        <th key={rate} className="text-text-secondary text-center p-2">{rate}%</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sensitivityData.discountRates.map((dr, i) => (
                      <tr key={dr}>
                        <td className="text-text-secondary p-2">{dr}%</td>
                        {sensitivityData.values[i].map((value, j) => (
                          <td key={j} className="text-center p-2">
                            <span className={`px-2 py-1 rounded ${
                              value > 30 ? 'bg-accent-green/20 text-accent-green' :
                              value > 20 ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-accent-red/20 text-accent-red'
                            }`}>
                              ${value}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <div className="text-sm text-text-secondary space-y-2">
                <p>• This DCF model uses a 5-year projection period with terminal value calculation.</p>
                <p>• Free cash flow = NOPAT - CapEx - Change in NWC</p>
                <p>• Terminal value uses perpetuity growth method.</p>
                <p>• Assumes no net debt for enterprise value to equity value conversion.</p>
                <p>• <strong>TODO:</strong> Integrate real-time financial data API for live calculations.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default DCFModule;