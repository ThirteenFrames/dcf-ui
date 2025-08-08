import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Rectangle, LineChart, Line } from 'recharts';
import { DCFModuleProps, DCFInputs, CompanyMeta } from '../types/dcf';
import { calculateDCF, sampleInputs, generateSensitivityData, fetchDCFInputs } from '../utils/dcf';
import { Input } from './ui/input';
// Tabs removed for dashboard-style layout
import { Separator } from './ui/separator';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

const formatAxisNumber = (value: number): string => {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${sign}${Math.round(abs / 1e12)}T`;
  if (abs >= 1e9) return `${sign}${Math.round(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}${Math.round(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}${Math.round(abs / 1e3)}K`;
  return `${value}`;
};

const DCFModule: React.FC<DCFModuleProps> = ({ ticker: initialTicker = 'AAPL', onValueChange }) => {
  const [ticker, setTicker] = useState(initialTicker);
  const [fetchedInputs, setFetchedInputs] = useState<DCFInputs | null>(null);
  const [companyMeta, setCompanyMeta] = useState<CompanyMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced fetch on ticker change
  useEffect(() => {
    if (!ticker || ticker.trim().length < 1) {
      setFetchedInputs(null);
      setCompanyMeta(null);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    const handle = setTimeout(async () => {
      try {
        const data = await fetchDCFInputs(ticker.trim());
        setFetchedInputs(data.inputs);
        // Pass through enriched meta directly
        setCompanyMeta(data.meta as CompanyMeta);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to fetch DCF inputs');
        setFetchedInputs(null);
        setCompanyMeta(null);
      } finally {
        setIsLoading(false);
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [ticker]);

  const inputs = fetchedInputs ?? sampleInputs; // prefer fetched inputs
  const calcOptions = useMemo(() => ({
    baseRevenue: companyMeta?.revenueLatest ?? undefined,
    sharesOutstanding: companyMeta?.sharesOutstanding ?? undefined,
    marketPrice: (companyMeta && companyMeta.price && companyMeta.price > 0)
      ? companyMeta.price
      : (companyMeta?.marketCap && companyMeta?.sharesOutstanding && companyMeta.sharesOutstanding > 0
          ? companyMeta.marketCap / companyMeta.sharesOutstanding
          : undefined),
    marketCap: companyMeta?.marketCap ?? undefined,
    fcfLatest: companyMeta?.fcfLatest ?? undefined,
    growthEstimate5Y: companyMeta?.growthEstimate5Y,
    periodYears: companyMeta?.periodYears,
    terminalRate: companyMeta?.terminalRate,
    netDebt: companyMeta?.netDebt ?? undefined,
    daPercent: companyMeta?.daPercent,
    useMidYear: true,
    wacc: companyMeta?.wacc ? companyMeta.wacc * 100 : undefined,
  }), [companyMeta]);

  const results = useMemo(() => calculateDCF(inputs, calcOptions), [inputs, calcOptions]);
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

  const sensitivityData = useMemo(() => generateSensitivityData(inputs, calcOptions), [inputs, calcOptions]);
  const [minSensitivity, maxSensitivity] = useMemo(() => {
    const flat = sensitivityData.values.flat();
    if (flat.length === 0) return [0, 0];
    return [Math.min(...flat), Math.max(...flat)];
  }, [sensitivityData]);
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
            <div className="relative p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium uppercase tracking-wide text-text-secondary">Intrinsic Value / Share</h2>
              </div>
              <div className="flex items-end justify-start gap-6">
                <div className="text-5xl md:text-6xl font-bold text-text-primary leading-tight">
                  ${animatedValue.toFixed(2)}
                </div>
                {companyMeta && (
                  <div className="text-sm text-text-secondary flex items-end gap-3">
                    <span className="mr-3">Ticker: <span className="text-text-primary font-semibold">{ticker.toUpperCase()}</span></span>
                    <span className="mr-3">Price: <span className="text-text-primary font-semibold">{(
                      companyMeta.price && companyMeta.price > 0
                        ? companyMeta.price
                        : (companyMeta.marketCap && companyMeta.sharesOutstanding && companyMeta.sharesOutstanding > 0
                            ? companyMeta.marketCap / companyMeta.sharesOutstanding
                            : 0)
                    ).toFixed(2)} {companyMeta.currency}</span></span>
                    {typeof companyMeta.wacc === 'number' && (
                      <span className="mr-3">WACC: <span className="text-text-primary font-semibold">{(companyMeta.wacc * 100).toFixed(2)}%</span></span>
                    )}
                    {typeof companyMeta.sharesOutstanding === 'number' && companyMeta.sharesOutstanding > 0 && (
                      <span className="mr-3">Shares: <span className="text-text-primary font-semibold">{(companyMeta.sharesOutstanding / 1_000_000_000).toFixed(2)}B</span></span>
                    )}
                  </div>
                )}
                <Input
                  id="ticker"
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  autoFocus
                  className="ml-auto w-64 md:w-80 h-12 bg-bg-elevate border-accent-green/30 focus:border-accent-green/30 text-text-primary font-semibold text-center rounded-xl placeholder:text-text-secondary/70 placeholder:text-xs placeholder:tracking-normal shadow-[0_0_0_3px_hsl(var(--accent-green)/0.12)] focus:shadow-[0_0_0_4px_hsl(var(--accent-green)/0.18)] transition-shadow"
                  aria-describedby="ticker-hint"
                  placeholder="Type a ticker (e.g., AAPL) to calculate the DCF"
                />
              </div>
              {!ticker && (
                <div id="ticker-hint" className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
                  <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent-green))] shadow-[0_0_8px_hsl(var(--accent-green)/0.8)] animate-pulse" />
                  <span>Type a stock symbol to see its calculated DCF.</span>
                </div>
              )}
              {isLoading && (
                <div className="mt-2 text-xs text-text-secondary">Fetching latest financials…</div>
              )}
              {error && (
                <div className="mt-2 text-xs text-accent-red">{error}</div>
              )}
            </div>

            <div className="mt-4 mx-6 mb-6 rounded-2xl bg-bg-space p-4 shadow-inner">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-center place-items-center">
                <div>
                   <div className="text-text-secondary">Enterprise Value</div>
                   <div className="text-text-primary font-semibold">
                     ${(results.enterpriseValue / 1_000_000_000).toFixed(1)}B
                   </div>
                </div>
                <div>
                  <div className="text-text-secondary">Market Cap</div>
                  <div className="text-text-primary font-semibold">
                    ${(results.impliedMarketCap / 1_000_000_000).toFixed(1)}B
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
          <div className="mt-4 ml-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Chart - left column */}
            <div className="p-0 lg:h-full lg:flex lg:flex-col">
              <h3 className="text-sm font-medium uppercase tracking-wide text-text-secondary mb-3">Projected FCF ({companyMeta?.periodYears ?? 5}Y)</h3>
              <div className="hidden lg:block lg:h-10" />
              <div className="h-64 lg:flex-1 lg:min-h-[22rem]">
                <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
                  {chartType === 'bar' ? (
                    <BarChart data={chartData} barSize={48}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-subtle))" />
                      <XAxis dataKey="year" stroke="hsl(var(--text-secondary))" tickMargin={12} />
                      <YAxis stroke="hsl(var(--text-secondary))" tickFormatter={formatAxisNumber} />
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
                      <YAxis stroke="hsl(var(--text-secondary))" tickFormatter={formatAxisNumber} />
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
              <div className="mt-2 lg:mt-auto lg:mb-0">
                <ToggleGroup
                  type="single"
                  value={chartType}
                  onValueChange={(v) => v && setChartType(v as 'bar' | 'line')}
                  className="justify-start"
                >
                  <ToggleGroupItem value="bar" aria-label="Bar chart">Bar</ToggleGroupItem>
                  <ToggleGroupItem value="line" aria-label="Line chart">Line</ToggleGroupItem>
                </ToggleGroup>
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
                        {sensitivityData.values[i].map((value, j) => {
                          const range = maxSensitivity - minSensitivity;
                          const ratio = range > 0 ? (value - minSensitivity) / range : 0.5;
                          const alpha = 0.15 + ratio * 0.55; // 0.15 → 0.70
                          const bg = `hsl(var(--accent-green) / ${alpha})`;
                          return (
                            <td key={j} className="text-center p-2">
                              <span className="px-2 py-1 rounded text-text-primary" style={{ backgroundColor: bg }}>
                                ${value}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-0 rounded-xl border border-border-subtle bg-bg-space/40 p-6 shadow-inset-card card-inset">
                <h3 className="text-sm font-medium uppercase tracking-wide text-text-secondary mb-2">Notes</h3>
                <div className="text-sm text-text-secondary space-y-2">
                  <p>• This DCF model uses a 5-year projection period with terminal value calculation.</p>
                  <p>• Free cash flow = NOPAT + D&A - CapEx - ΔNWC (mid-year discounting)</p>
                  <p>• Terminal value uses perpetuity growth method.</p>
                  <p>• Includes net debt bridge from enterprise value to equity value when available.</p>
                  <p>• Discount rate uses WACC when available; otherwise a default is used.</p>
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