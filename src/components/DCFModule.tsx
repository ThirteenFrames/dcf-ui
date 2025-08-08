import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Rectangle } from 'recharts';
import { DCFModuleProps } from '../types/dcf';
import { calculateDCF, sampleInputs, generateSensitivityData } from '../utils/dcf';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

const DCFModule: React.FC<DCFModuleProps> = ({ ticker: initialTicker = 'SAMPLE', onValueChange }) => {
  const [ticker, setTicker] = useState(initialTicker);
  const inputs = sampleInputs; // static inputs (read-only)
  const results = useMemo(() => calculateDCF(inputs), [inputs]);
  const [animatedValue, setAnimatedValue] = useState(0);
  const rafIdRef = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dcf');

  useEffect(() => {
    onValueChange?.(results.intrinsicValue);
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const start = animatedValue;
    const end = results.intrinsicValue;
    const duration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = start + (end - start) * easeOutQuart;
      setAnimatedValue(current);
      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        rafIdRef.current = null;
      }
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [results.intrinsicValue, onValueChange]);

  const sensitivityData = useMemo(() => generateSensitivityData(inputs), [inputs]);
  
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

  // No input fields — assumptions are static

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-bg-space bg-grid-dots min-h-screen animate-fade-in">
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

      <div className="dcf-module mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-text-primary mt-4">DCF Valuation Module</h1>
          <div className="flex items-center gap-3">
            <Label htmlFor="ticker" className="text-text-secondary">Ticker</Label>
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
      </div>

      <div className="space-y-8">
        {/* Assumptions Summary (static) */}
        <div className="bg-bg-elevate rounded-2xl p-6 shadow-[0_0_24px_rgba(0,0,0,0.35)] shadow-inset-card card-inset border border-border-subtle animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary">Assumptions</h2>
            <div className="text-xs text-text-secondary">Read-only</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 text-sm">
            <div><div className="text-text-secondary">Revenue CAGR</div><div className="text-text-primary font-medium">{inputs.revenueCagr}%</div></div>
            <div><div className="text-text-secondary">EBIT Margin</div><div className="text-text-primary font-medium">{inputs.ebitMargin}%</div></div>
            <div><div className="text-text-secondary">Tax Rate</div><div className="text-text-primary font-medium">{inputs.taxRate}%</div></div>
            <div><div className="text-text-secondary">CapEx %</div><div className="text-text-primary font-medium">{inputs.capexPercent}%</div></div>
            <div><div className="text-text-secondary">NWC %</div><div className="text-text-primary font-medium">{inputs.nwcPercent}%</div></div>
            <div><div className="text-text-secondary">Terminal Growth</div><div className="text-text-primary font-medium">{inputs.terminalGrowth}%</div></div>
            <div><div className="text-text-secondary">Discount Rate</div><div className="text-text-primary font-medium">{inputs.discountRate}%</div></div>
          </div>
        </div>

        {/* Output Card */}
        <div className="bg-bg-elevate rounded-2xl p-6 shadow-[0_0_24px_rgba(0,0,0,0.35)] shadow-inset-card card-inset border border-border-subtle animate-fade-in">
          <div className="mb-6">
            <div className="rounded-2xl bg-bg-space border border-border-subtle p-6 animate-fade-in">
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="tab-pill-container w-full" data-value={activeTab}>
              <TabsList className="tab-pill w-full !grid grid-cols-3 place-items-center rounded-full p-0.5 border border-border-subtle bg-bg-space relative">
                <TabsTrigger value="dcf" className="w-full h-9 justify-center text-center rounded-full text-text-secondary data-[state=active]:!text-white data-[state=active]:!bg-transparent data-[state=active]:!shadow-none px-0">DCF</TabsTrigger>
                <TabsTrigger value="sensitivity" className="w-full h-9 justify-center text-center rounded-full text-text-secondary data-[state=active]:!text-white data-[state=active]:!bg-transparent data-[state=active]:!shadow-none px-0">Sensitivity</TabsTrigger>
                <TabsTrigger value="notes" className="w-full h-9 justify-center text-center rounded-full text-text-secondary data-[state=active]:!text-white data-[state=active]:!bg-transparent data-[state=active]:!shadow-none px-0">Notes</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dcf" className="mt-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                    <XAxis
                      dataKey="year"
                      stroke="hsl(var(--text-secondary))"
                      tickMargin={14}
                    />
                    <YAxis stroke="hsl(var(--text-secondary))" />
                    <Tooltip
                      cursor={false}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--bg-space))',
                        border: '1px solid hsl(var(--border-subtle))',
                        borderRadius: '8px',
                        color: 'hsl(var(--text-primary))'
                      }}
                      wrapperStyle={{ outline: 'none' }}
                      itemStyle={{ color: 'hsl(var(--text-primary))' }}
                      labelStyle={{ color: 'hsl(var(--text-secondary))' }}
                    />
                    <Bar
                      dataKey="fcf"
                      fill="hsl(var(--accent-green))"
                      radius={[8, 8, 0, 0]}
                      activeBar={<Rectangle radius={[8, 8, 0, 0]} className="dcf-bar-active" />}
                    />
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