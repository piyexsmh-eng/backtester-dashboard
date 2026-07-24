import React, { useCallback } from 'react';
import './App.css';

// Fetch real data dari Binance
async function fetchBinanceData(symbol = 'BTCUSDT', interval = '1h', limit = 500) {
  try {
    console.log(`Fetching ${symbol} data...`);
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    
    if (!response.ok) throw new Error('Binance API error');
    
    const klines = await response.json();
    
    const data = klines.map(kline => ({
      time: new Date(kline[0]).toISOString().split('T')[0],
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[7])
    }));
    
    console.log(`Got ${data.length} candles from Binance`);
    return data;
  } catch (error) {
    console.error('Binance fetch error:', error);
    return generateMockData();
  }
}

class Indicators {
  static calculateEMAArray(prices, period) {
    if (prices.length < period) return [];
    const k = 2 / (period + 1);
    const emaArray = [];
    let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;
    emaArray.push(ema);
    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
      emaArray.push(ema);
    }
    return emaArray;
  }

  static calculateRSIArray(prices, period = 14) {
    if (prices.length < period + 1) return [];
    const rsiArray = [];
    for (let i = period; i < prices.length; i++) {
      const subPrices = prices.slice(0, i + 1);
      let gains = 0, losses = 0;
      for (let j = 1; j <= period; j++) {
        const change = subPrices[subPrices.length - j] - subPrices[subPrices.length - j - 1];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
      }
      let avgGain = gains / period;
      let avgLoss = losses / period;
      let rsi = 100 - (100 / (1 + avgGain / avgLoss));
      rsiArray.push(rsi);
    }
    return rsiArray;
  }
}

class Metrics {
  static calculateMetrics(trades, initialBalance = 10000) {
    if (trades.length === 0) {
      return { totalTrades: 0, winTrades: 0, lossTrades: 0, winRate: 0, profitFactor: 0, totalProfit: 0, totalLoss: 0, netProfit: 0, returnPercent: 0, maxDrawdown: 0, sharpeRatio: 0, avgWin: 0, avgLoss: 0 };
    }
    let totalProfit = 0, totalLoss = 0, winTrades = 0, lossTrades = 0;
    const returns = [];
    for (const trade of trades) {
      const tradeReturn = parseFloat(trade.profit);
      if (tradeReturn > 0) { totalProfit += tradeReturn; winTrades++; }
      else { totalLoss += Math.abs(tradeReturn); lossTrades++; }
      returns.push((tradeReturn / initialBalance) * 100);
    }
    const winRate = winTrades / trades.length;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999.99 : 0;
    const netProfit = totalProfit - totalLoss;
    const returnPercent = (netProfit / initialBalance) * 100;
    const avgWin = winTrades > 0 ? totalProfit / winTrades : 0;
    const avgLoss = lossTrades > 0 ? totalLoss / lossTrades : 0;
    let maxDrawdown = 0, peak = initialBalance, balance = initialBalance;
    for (const trade of trades) {
      balance += parseFloat(trade.profit);
      if (balance > peak) peak = balance;
      const drawdown = (peak - balance) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    let sharpeRatio = 0;
    if (returns.length > 1) {
      const meanReturn = returns.reduce((a, b) => a + b) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);
      sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;
    }
    return { totalTrades: trades.length, winTrades, lossTrades, winRate: (winRate * 100).toFixed(2), profitFactor: profitFactor.toFixed(2), totalProfit: totalProfit.toFixed(2), totalLoss: totalLoss.toFixed(2), netProfit: netProfit.toFixed(2), returnPercent: returnPercent.toFixed(2), maxDrawdown: (maxDrawdown * 100).toFixed(2), sharpeRatio: sharpeRatio.toFixed(2), avgWin: avgWin.toFixed(2), avgLoss: avgLoss.toFixed(2) };
  }
}

class Backtester {
  constructor(options = {}) {
    this.rsiPeriod = options.rsiPeriod || 14;
    this.emaShort = options.emaShort || 9;
    this.emaLong = options.emaLong || 21;
    this.rsiOversold = options.rsiOversold || 30;
    this.rsiOverbought = options.rsiOverbought || 70;
    this.positionSize = options.positionSize || 0.95;
    this.slippage = options.slippage || 0.001;
    this.initialBalance = options.initialBalance || 10000;
  }

  run(data) {
    if (!data || data.length < Math.max(this.rsiPeriod, this.emaLong) + 1) throw new Error('Insufficient data');
    const closes = data.map(d => parseFloat(d.close));
    const rsiArray = Indicators.calculateRSIArray(closes, this.rsiPeriod);
    const emaShortArray = Indicators.calculateEMAArray(closes, this.emaShort);
    const emaLongArray = Indicators.calculateEMAArray(closes, this.emaLong);
    const trades = [];
    let balance = this.initialBalance;
    let position = null;
    const startIndex = Math.max(this.rsiPeriod, this.emaLong);
    for (let i = startIndex; i < closes.length; i++) {
      const rsi = rsiArray[i - this.rsiPeriod];
      const emaShort = emaShortArray[i - this.emaShort];
      const emaLong = emaLongArray[i - this.emaLong];
      const price = closes[i];
      if (!position) {
        if (rsi < this.rsiOversold && emaShort > emaLong) {
          const entryPrice = price * (1 + this.slippage);
          const quantity = (balance * this.positionSize) / entryPrice;
          position = { entryPrice, entryIndex: i, quantity, entryTime: data[i].time, type: 'long' };
        }
      } else if (position.type === 'long') {
        let shouldExit = false;
        if (rsi > this.rsiOverbought) shouldExit = true;
        else if (i > position.entryIndex + 1 && emaShort < emaLong) shouldExit = true;
        if (shouldExit) {
          const exitPrice = price * (1 - this.slippage);
          const profit = (exitPrice - position.entryPrice) * position.quantity;
          const profitPercent = ((exitPrice - position.entryPrice) / position.entryPrice * 100).toFixed(2);
          trades.push({ type: 'long', entryPrice: position.entryPrice.toFixed(2), exitPrice: exitPrice.toFixed(2), quantity: position.quantity.toFixed(4), profit: profit.toFixed(2), profitPercent, entryTime: position.entryTime, exitTime: data[i].time, duration: i - position.entryIndex });
          balance += profit;
          position = null;
        }
      }
    }
    if (position) {
      const exitPrice = closes[closes.length - 1] * (1 - this.slippage);
      const profit = (exitPrice - position.entryPrice) * position.quantity;
      const profitPercent = ((exitPrice - position.entryPrice) / position.entryPrice * 100).toFixed(2);
      trades.push({ type: 'long', entryPrice: position.entryPrice.toFixed(2), exitPrice: exitPrice.toFixed(2), quantity: position.quantity.toFixed(4), profit: profit.toFixed(2), profitPercent, entryTime: position.entryTime, exitTime: data[data.length - 1].time, duration: closes.length - position.entryIndex, closed: false });
      balance += profit;
    }
    const metrics = Metrics.calculateMetrics(trades, this.initialBalance);
    return { strategy: 'RSI + EMA Crossover', parameters: { rsiPeriod: this.rsiPeriod, emaShort: this.emaShort, emaLong: this.emaLong, rsiOversold: this.rsiOversold, rsiOverbought: this.rsiOverbought }, results: { trades, metrics, finalBalance: balance.toFixed(2), totalReturn: ((balance - this.initialBalance) / this.initialBalance * 100).toFixed(2) } };
  }
}

function generateMockData(startPrice = 45000, days = 300) {
  const data = [];
  let currentPrice = startPrice;
  for (let i = 0; i < days; i++) {
    const randomChange = (Math.random() - 0.48) * 2000;
    const open = currentPrice;
    const close = currentPrice + randomChange;
    data.push({ time: 'Day-' + String(i + 1).padStart(3, '0'), open: open.toFixed(2), high: (Math.max(open, close) + Math.abs(randomChange) * 0.3).toFixed(2), low: (Math.min(open, close) - Math.abs(randomChange) * 0.3).toFixed(2), close: close.toFixed(2) });
    currentPrice = close;
  }
  return data;
}

export default function App() {
  const [result, setResult] = React.useState(null);
  const [rsiPeriod, setRsiPeriod] = React.useState(14);
  const [emaShort, setEmaShort] = React.useState(9);
  const [emaLong, setEmaLong] = React.useState(21);
  const [rsiOversold, setRsiOversold] = React.useState(30);
  const [rsiOverbought, setRsiOverbought] = React.useState(70);
  const [binanceSymbol, setBinanceSymbol] = React.useState('BTCUSDT');
  const [binanceInterval, setBinanceInterval] = React.useState('1h');
  const [isLoading, setIsLoading] = React.useState(false);

  const runBacktest = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchBinanceData(binanceSymbol, binanceInterval, 500);
      const backtester = new Backtester({ rsiPeriod, emaShort, emaLong, rsiOversold, rsiOverbought, positionSize: 0.95, slippage: 0.001, initialBalance: 10000 });
      const backResult = backtester.run(data);
      setResult(backResult);
    } catch (error) {
      console.error('Backtest error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [rsiPeriod, emaShort, emaLong, rsiOversold, rsiOverbought, binanceSymbol, binanceInterval]);

  React.useEffect(() => {
    runBacktest();
  }, [runBacktest]);

  return (
    <div className="app">
      <div className="header">
        <h1>📊 Backtesting Engine</h1>
        <p>RSI + EMA Crossover Strategy</p>
      </div>
      <div className="container">
        <div className="controls">
          <h2>Data Source</h2>
          <div className="param-group">
            <label>Crypto Symbol</label>
            <select value={binanceSymbol} onChange={(e) => setBinanceSymbol(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#1e293b', color: '#e2e8f0' }}>
              <option value="BTCUSDT">BTC/USDT</option>
              <option value="ETHUSDT">ETH/USDT</option>
              <option value="BNBUSDT">BNB/USDT</option>
              <option value="ADAUSDT">ADA/USDT</option>
            </select>
          </div>
          <div className="param-group">
            <label>Timeframe</label>
            <select value={binanceInterval} onChange={(e) => setBinanceInterval(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#1e293b', color: '#e2e8f0' }}>
              <option value="1h">1 Hour</option>
              <option value="4h">4 Hour</option>
              <option value="1d">1 Day</option>
            </select>
          </div>
          {isLoading && <p style={{ color: '#10b981', marginTop: '10px' }}>⏳ Fetching data...</p>}

          <h2 style={{ marginTop: '30px' }}>Strategy Parameters</h2>
          <div className="param-group">
            <label>RSI Period: <span>{rsiPeriod}</span></label>
            <input type="range" min="5" max="50" value={rsiPeriod} onChange={(e) => setRsiPeriod(parseInt(e.target.value))} />
          </div>
          <div className="param-group">
            <label>EMA Short: <span>{emaShort}</span></label>
            <input type="range" min="5" max="50" value={emaShort} onChange={(e) => setEmaShort(parseInt(e.target.value))} />
          </div>
          <div className="param-group">
            <label>EMA Long: <span>{emaLong}</span></label>
            <input type="range" min="10" max="100" value={emaLong} onChange={(e) => setEmaLong(parseInt(e.target.value))} />
          </div>
          <div className="param-group">
            <label>RSI Oversold: <span>{rsiOversold}</span></label>
            <input type="range" min="10" max="40" value={rsiOversold} onChange={(e) => setRsiOversold(parseInt(e.target.value))} />
          </div>
          <div className="param-group">
            <label>RSI Overbought: <span>{rsiOverbought}</span></label>
            <input type="range" min="60" max="90" value={rsiOverbought} onChange={(e) => setRsiOverbought(parseInt(e.target.value))} />
          </div>
        </div>
        {result && (
          <div className="results">
            <div className="metrics-grid">
              <div className="metric-card"><div className="metric-label">Total Trades</div><div className="metric-value">{result.results.metrics.totalTrades}</div></div>
              <div className="metric-card"><div className="metric-label">Win Rate</div><div className="metric-value" style={{ color: result.results.metrics.winRate > 50 ? '#10b981' : '#ef4444' }}>{result.results.metrics.winRate}%</div></div>
              <div className="metric-card"><div className="metric-label">Profit Factor</div><div className="metric-value">{result.results.metrics.profitFactor}</div></div>
              <div className="metric-card"><div className="metric-label">Return</div><div className="metric-value" style={{ color: result.results.metrics.returnPercent > 0 ? '#10b981' : '#ef4444' }}>{result.results.metrics.returnPercent}%</div></div>
              <div className="metric-card"><div className="metric-label">Net Profit</div><div className="metric-value">${result.results.metrics.netProfit}</div></div>
              <div className="metric-card"><div className="metric-label">Max Drawdown</div><div className="metric-value">{result.results.metrics.maxDrawdown}%</div></div>
              <div className="metric-card"><div className="metric-label">Sharpe Ratio</div><div className="metric-value">{result.results.metrics.sharpeRatio}</div></div>
              <div className="metric-card"><div className="metric-label">Final Balance</div><div className="metric-value">${result.results.finalBalance}</div></div>
            </div>
            {result.results.trades.length > 0 && (
              <div className="trades-section">
                <h2>Recent Trades</h2>
                <div className="trades-list">
                  {result.results.trades.slice(-5).map((trade, idx) => (
                    <div key={idx} className={`trade-card ${parseFloat(trade.profit) > 0 ? 'win' : 'loss'}`}>
                      <div className="trade-header">Trade #{result.results.trades.length - 5 + idx + 1}</div>
                      <div className="trade-details">
                        <div>Entry: ${trade.entryPrice}</div>
                        <div>Exit: ${trade.exitPrice}</div>
                        <div>P&L: <span style={{ color: parseFloat(trade.profit) > 0 ? '#10b981' : '#ef4444' }}>${trade.profit} ({trade.profitPercent}%)</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
