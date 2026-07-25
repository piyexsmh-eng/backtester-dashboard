import React, { useState, useEffect } from 'react';
import { fetchBinanceData } from './services/binance';
import Backtester from './engine/Backtester'; // sesuaikan path jika berbeda

// Default parameters
const DEFAULT_PARAMS = {
  rsiPeriod: 14,
  emaShort: 9,
  emaLong: 21,
  rsiOversold: 30,
  rsiOverbought: 70,
};

// Generate mock data (300 candles)
const generateMockData = (count = 300) => {
  const data = [];
  let price = 50000;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * 1500;
    price = Math.max(10000, price + change);
    data.push({
      time: Date.now() - (count - i) * 60000,
      open: price - 10,
      high: price + 20,
      low: price - 20,
      close: price,
      volume: Math.random() * 100,
    });
  }
  return data;
};

function App() {
  // State untuk parameter
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [results, setResults] = useState(null);
  const [trades, setTrades] = useState([]);
  const [dataSource, setDataSource] = useState('mock');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1h');
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState([]);

  // Fungsi menjalankan backtest
  const runBacktest = (data, params) => {
    const engine = new Backtester(params);
    const result = engine.run(data);
    setResults(result);
    setTrades(result.trades?.slice(-5) || []);
  };

  // Jalankan dengan mock data saat awal
  useEffect(() => {
    const mockData = generateMockData(300);
    runBacktest(mockData, DEFAULT_PARAMS);
    setDataSource('mock');
  }, []);

  // Handler untuk slider
  const handleParamChange = (key, value) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    // Jalankan ulang dengan data yang sama (mock atau real)
    if (dataSource === 'mock') {
      const mockData = generateMockData(300);
      runBacktest(mockData, newParams);
    } else {
      // Jika data real, kita perlu menyimpan data real di state
      // Untuk sederhana, kita akan re-fetch (tapi bisa cache)
      // Saya akan tambahkan state untuk realData nanti
      // Untuk sekarang, abaikan atau panggil handleFetchRealData
    }
  };

  // Fetch data real dari Binance
  const handleFetchRealData = async () => {
    setIsLoading(true);
    try {
      const realData = await fetchBinanceData(symbol, interval, 300);
      runBacktest(realData, params);
      setDataSource('binance');
    } catch (err) {
      console.error(err);
      alert('Gagal fetch data Binance, coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Optimizer: coba berbagai kombinasi parameter, cari yang terbaik
  const runOptimizer = async () => {
    setIsOptimizing(true);
    setOptimizationResults([]);
    try {
      const data = dataSource === 'binance'
        ? await fetchBinanceData(symbol, interval, 300)
        : generateMockData(300);

      const rsiPeriods = [10, 14, 18];
      const emaShorts = [5, 9, 12];
      const emaLongs = [21, 26, 34];
      const oversolds = [25, 30, 35];
      const overboughts = [65, 70, 75];

      const combos = [];
      for (const rsiPeriod of rsiPeriods) {
        for (const emaShort of emaShorts) {
          for (const emaLong of emaLongs) {
            if (emaShort >= emaLong) continue;
            for (const rsiOversold of oversolds) {
              for (const rsiOverbought of overboughts) {
                combos.push({ rsiPeriod, emaShort, emaLong, rsiOversold, rsiOverbought });
              }
            }
          }
        }
      }

      const testResults = [];
      for (const combo of combos) {
        try {
          const engine = new Backtester(combo);
          const result = engine.run(data);
          if (result.metrics.totalTrades >= 3) {
            testResults.push({
              ...combo,
              totalTrades: result.metrics.totalTrades,
              winRate: result.metrics.winRate,
              profitFactor: parseFloat(result.metrics.profitFactor),
              totalReturn: parseFloat(result.totalReturn)
            });
          }
        } catch (e) {}
      }

      testResults.sort((a, b) => b.profitFactor - a.profitFactor);
      setOptimizationResults(testResults.slice(0, 5));
    } catch (err) {
      console.error(err);
      alert('Gagal menjalankan optimizer.');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Render metrics card
  const renderMetrics = () => {
    if (!results) return null;
    const { totalTrades, winRate, profitFactor } = results.metrics; const returnPercent = parseFloat(results.totalReturn); const sharpeRatio = 0; const maxDrawdown = 0;
    const signal = results.currentSignal;
    return (
      <>
      <div className={`p-4 rounded-lg mb-4 text-center font-bold text-xl ${signal.signal === "BUY" ? "bg-green-600" : signal.signal === "SELL" ? "bg-red-600" : "bg-slate-700"}`}>
        Signal: {signal.signal} | Price: ${signal.price} | RSI: {signal.rsi}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Trades" value={totalTrades} />
        <MetricCard label="Win Rate" value={`${winRate}%`} />
        <MetricCard label="Return" value={`${returnPercent.toFixed(2)}%`} />
        <MetricCard label="Profit Factor" value={profitFactor.toFixed(2)} />
        <MetricCard label="Sharpe Ratio" value={sharpeRatio.toFixed(2)} />
        <MetricCard label="Max Drawdown" value={`${(maxDrawdown * 100).toFixed(2)}%`} />
      </div>
      </>
    );
  };

  const MetricCard = ({ label, value }) => (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
      <div className="text-slate-400 text-sm">{label}</div>
      <div className="text-white text-2xl font-bold">{value}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-emerald-400">Crypto Backtester</h1>

        {/* Data Source Controls */}
        <div className="flex flex-wrap gap-4 items-end mb-6 bg-slate-800 p-4 rounded-lg border border-slate-700">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Symbol</label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            >
              <option value="BTCUSDT">BTC/USDT</option>
              <option value="ETHUSDT">ETH/USDT</option>
              <option value="BNBUSDT">BNB/USDT</option>
              <option value="SOLUSDT">SOL/USDT</option>
              <option value="XRPUSDT">XRP/USDT</option>
              <option value="ADAUSDT">ADA/USDT</option>
              <option value="DOGEUSDT">DOGE/USDT</option>
              <option value="AVAXUSDT">AVAX/USDT</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Interval</label>
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            >
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hours</option>
              <option value="1d">1 Day</option>
            </select>
          </div>
          <button
            onClick={handleFetchRealData}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium"
          >
            {isLoading ? 'Loading...' : '📊 Fetch Real Data'}
          </button>
          <button
            onClick={runOptimizer}
            disabled={isOptimizing}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 rounded text-white font-medium"
          >
            {isOptimizing ? "Optimizing..." : "🎯 Optimize Parameters"}
          </button>
          <span className="text-xs text-slate-500">
            {dataSource === 'binance' ? '🟢 Live Data' : '⚪ Mock Data'}
          </span>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 bg-slate-800 p-4 rounded-lg border border-slate-700">
          <Slider
            label="RSI Period"
            value={params.rsiPeriod}
            min={5}
            max={30}
            step={1}
            onChange={(v) => handleParamChange('rsiPeriod', v)}
          />
          <Slider
            label="EMA Short"
            value={params.emaShort}
            min={5}
            max={50}
            step={1}
            onChange={(v) => handleParamChange('emaShort', v)}
          />
          <Slider
            label="EMA Long"
            value={params.emaLong}
            min={10}
            max={100}
            step={1}
            onChange={(v) => handleParamChange('emaLong', v)}
          />
          <Slider
            label="RSI Oversold"
            value={params.rsiOversold}
            min={10}
            max={40}
            step={1}
            onChange={(v) => handleParamChange('rsiOversold', v)}
          />
          <Slider
            label="RSI Overbought"
            value={params.rsiOverbought}
            min={60}
            max={90}
            step={1}
            onChange={(v) => handleParamChange('rsiOverbought', v)}
          />
        </div>

        {/* Metrics */}
        {renderMetrics()}

        {/* Optimizer Results */}
        {optimizationResults.length > 0 && (
          <div className="bg-slate-800 p-4 rounded-lg border border-purple-700 mb-6">
            <h2 className="text-xl font-semibold mb-3 text-purple-400">🎯 Top 5 Kombinasi Terbaik</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2">RSI</th>
                    <th className="text-left py-2">EMA S/L</th>
                    <th className="text-left py-2">Over/Sold</th>
                    <th className="text-left py-2">Trades</th>
                    <th className="text-left py-2">Win%</th>
                    <th className="text-left py-2">PF</th>
                    <th className="text-left py-2">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {optimizationResults.map((r, i) => (
                    <tr key={i} className="border-b border-slate-700">
                      <td className="py-2">{r.rsiPeriod}</td>
                      <td className="py-2">{r.emaShort}/{r.emaLong}</td>
                      <td className="py-2">{r.rsiOversold}/{r.rsiOverbought}</td>
                      <td className="py-2">{r.totalTrades}</td>
                      <td className="py-2">{r.winRate}%</td>
                      <td className="py-2 text-purple-400 font-bold">{r.profitFactor.toFixed(2)}</td>
                      <td className={`py-2 ${r.totalReturn > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{r.totalReturn.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Trades */}
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
          <h2 className="text-xl font-semibold mb-3 text-slate-300">Recent Trades</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2">Time</th>
                  <th className="text-left py-2">Type</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">P&L</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 ? (
                  <tr><td colSpan="4" className="text-center text-slate-500 py-4">No trades yet</td></tr>
                ) : (
                  trades.map((trade, idx) => (
                    <tr key={idx} className="border-b border-slate-700/50">
                      <td className="py-2">{new Date(trade.time).toLocaleString()}</td>
                      <td className="py-2">{trade.type}</td>
                      <td className="text-right py-2">${trade.price.toFixed(2)}</td>
                      <td className={`text-right py-2 ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${trade.pnl.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Komponen Slider
const Slider = ({ label, value, min, max, step, onChange }) => (
  <div>
    <label className="block text-sm text-slate-400 mb-1">
      {label}: <span className="text-white font-mono">{value}</span>
    </label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-emerald-500 bg-slate-700 rounded-lg appearance-none cursor-pointer"
    />
  </div>
);

export default App;
