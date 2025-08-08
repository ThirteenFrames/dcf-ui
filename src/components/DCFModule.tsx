import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Rectangle, LineChart, Line } from 'recharts';
import { DCFModuleProps } from '../types/dcf';
import { calculateDCF, sampleInputs, generateSensitivityData } from '../utils/dcf';
import { Input } from './ui/input';
// Tabs removed for dashboard-style layout
import { Separator } from './ui/separator';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

const DCFModule: React.FC<DCFModuleProps> = ({ ticker: initialTicker = '', onValueChange }) => {
  const [ticker, setTicker] = useState(initialTicker);
  const inputs = sampleInputs; // static inputs (read-only)
  const results = useMemo(() => calculateDCF(inputs), [inputs]);
  const [animatedValue, setAnimatedValue] = useState(0);
  const rafIdRef = useRef<number | null>(null);
  // Tabs removed

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
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  
  const chartData = results.projectedFCFs.map((fcf, index) => ({
    year: `Y${index + 1}`,
    fcf: Math.round(fcf),
  }));

  const chartConfig = useMemo(
    () => ({
      fcf: { label: 'FCF', color: 'hsl(var(--accent-green))' },
    }),
    []
  );

  // Removed valuation status tab

  // No input fields — assumptions are static

  return (
    <div className="w-full max-w-7xl mx-auto p-6 min-h-screen animate-fade-in">
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
        <div className="flex items-center justify-start">
          <h1 className="text-3xl font-bold text-text-primary mt-4">DCF Valuation Module</h1>
        </div>
      </div>

      <div className="space-y-8">
        {/* Removed separate assumptions container */}

        {/* Output Card */}
        <div className="relative overflow-visible bg-bg-elevate rounded-2xl p-6 shadow-[0_0_24px_rgba(0,0,0,0.35)] shadow-inset-card card-inset border border-border-subtle animate-fade-in">
          <div className="mb-6">
            <div className="relative p-6 pr-64 md:pr-80 animate-fade-in">
              <div className="absolute right-6 top-1/2 -translate-y-1/2 mr-6">
                <Input
                  id="ticker"
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  autoFocus
                  className="w-64 md:w-80 h-12 bg-bg-elevate border-accent-green/30 focus:border-accent-green/30 text-text-primary font-semibold text-center rounded-xl placeholder:text-text-secondary/70 placeholder:text-xs placeholder:tracking-normal shadow-[0_0_0_3px_hsl(var(--accent-green)/0.12)] focus:shadow-[0_0_0_4px_hsl(var(--accent-green)/0.18)] transition-shadow"
                  aria-describedby="ticker-hint"
                  placeholder="Type a ticker (e.g., AAPL) to calculate the DCF"
                />
                {!ticker && (
                  <div id="ticker-hint" className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
                    <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent-green))] shadow-[0_0_8px_hsl(var(--accent-green)/0.8)] animate-pulse" />
                    <span>Type a stock symbol to see its calculated DCF.</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-text-secondary">Intrinsic Value / Share</h2>
              </div>
              <div className="flex items-center justify-start gap-6">
                <div className="text-5xl md:text-6xl font-bold text-text-primary leading-tight">
                  ${animatedValue.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-4 mb-6 rounded-2xl bg-bg-space p-4 shadow-inner">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-center place-items-center">
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
          </div>

          {/* Dashboard grid replacing tabs */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart - left column */}
            <div className="p-0">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium uppercase tracking-wide text-text-secondary">Projected FCF (5Y)</h3>
                <ToggleGroup type="single" value={chartType} onValueChange={(v) => v && setChartType(v as 'bar' | 'line')}>
                  <ToggleGroupItem value="bar" aria-label="Bar chart">Bar</ToggleGroupItem>
                  <ToggleGroupItem value="line" aria-label="Line chart">Line</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="h-64">
                <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
                  {chartType === 'bar' ? (
                    <BarChart data={chartData} barSize={10}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                      <XAxis dataKey="year" stroke="hsl(var(--text-secondary))" tickMargin={12} />
                      <YAxis stroke="hsl(var(--text-secondary))" />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="fcf"
                        fill="var(--color-fcf)"
                        radius={[8, 8, 0, 0]}
                        activeBar={<Rectangle radius={[8, 8, 0, 0]} className="dcf-bar-active" />}
                      />
                    </BarChart>
                  ) : (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                      <XAxis dataKey="year" stroke="hsl(var(--text-secondary))" tickMargin={12} />
                      <YAxis stroke="hsl(var(--text-secondary))" />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="fcf"
                        stroke="var(--color-fcf)"
                        strokeWidth={2}
                        dot={{ r: 3, stroke: 'transparent', fill: 'var(--color-fcf)' }}
                        activeDot={{ r: 4, stroke: 'transparent', fill: 'var(--color-fcf)', className: 'dcf-dot-active' }}
                      />
                    </LineChart>
                  )}
                </ChartContainer>
              </div>
            </div>

            {/* Right column: matrix + notes stacked */}
            <div className="flex flex-col gap-10">
              <div className="overflow-x-auto p-0">
                <h3 className="text-sm font-medium uppercase tracking-wide text-text-secondary mb-3">Sensitivity Matrix</h3>
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

              <div className="mt-0 pt-2">
                <h3 className="text-sm font-medium uppercase tracking-wide text-text-secondary mb-2">Notes</h3>
                <div className="text-sm text-text-secondary space-y-2">
                  <p>• This DCF model uses a 5-year projection period with terminal value calculation.</p>
                  <p>• Free cash flow = NOPAT - CapEx - Change in NWC</p>
                  <p>• Terminal value uses perpetuity growth method.</p>
                  <p>• Assumes no net debt for enterprise value to equity value conversion.</p>
                  <p>• <strong>TODO:</strong> Integrate real-time financial data API for live calculations.</p>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6 bg-border" />
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary tracking-wide">Assumptions</h3>
            <span className="text-xs text-text-secondary">Read-only</span>
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
      </div>
    </div>
  );
};

export default DCFModule;