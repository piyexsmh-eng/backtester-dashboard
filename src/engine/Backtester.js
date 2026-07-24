// RSI + EMA Crossover Backtester Engine

class Indicators {
  static calculateRSI(prices, period = 14) {
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
      
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss > 0 ? avgGain / avgLoss : 0;
      const rsi = 100 - (100 / (1 + rs));
      rsiArray.push(rsi);
    }
    return rsiArray;
  }

  static calculateEMA(prices, period) {
    if (prices.length < period) return [];
    const k = 2 / (period + 1);
    const emaArray = [];
    let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
      emaArray.push(ema);
    }
    return emaArray;
  }
}

class Backtester {
  constructor(options = {}) {
    this.rsiPeriod = options.rsiPeriod || 14;
    this.emaShort = options.emaShort || 9;
    this.emaLong = options.emaLong || 21;
    this.rsiOversold = options.rsiOversold || 30;
    this.rsiOverbought = options.rsiOverbought || 70;
    this.initialBalance = options.initialBalance || 10000;
    this.positionSize = options.positionSize || 0.95;
  }

  run(data) {
    if (!data || data.length < this.emaLong + 1) {
      console.error('Insufficient data');
      return { trades: [], metrics: {} };
    }

    const closes = data.map(d => parseFloat(d.close));
    const rsiArray = Indicators.calculateRSI(closes, this.rsiPeriod);
    const emaShortArray = Indicators.calculateEMA(closes, this.emaShort);
    const emaLongArray = Indicators.calculateEMA(closes, this.emaLong);

    const trades = [];
    let balance = this.initialBalance;
    let position = null;

    const startIdx = Math.max(this.rsiPeriod, this.emaLong);

    for (let i = startIdx; i < closes.length; i++) {
      const rsi = rsiArray[i - this.rsiPeriod];
      const emaShort = emaShortArray[i - this.emaShort];
      const emaLong = emaLongArray[i - this.emaLong];
      const price = closes[i];

      // BUY SIGNAL
      if (!position && rsi < this.rsiOversold && emaShort > emaLong) {
        const quantity = (balance * this.positionSize) / price;
        position = { entryPrice: price, entryIdx: i, quantity };
      }

      // SELL SIGNAL
      if (position) {
        let shouldExit = false;
        if (rsi > this.rsiOverbought) shouldExit = true;
        else if (i > position.entryIdx + 1 && emaShort < emaLong) shouldExit = true;

        if (shouldExit) {
          const profit = (price - position.entryPrice) * position.quantity;
          const profitPercent = ((price - position.entryPrice) / position.entryPrice * 100).toFixed(2);
          
          trades.push({
            entryPrice: position.entryPrice.toFixed(2),
            exitPrice: price.toFixed(2),
            profit: profit.toFixed(2),
            profitPercent,
            type: profit > 0 ? 'win' : 'loss'
          });
          
          balance += profit;
          position = null;
        }
      }
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(trades);
    
    return {
      trades,
      metrics,
      finalBalance: balance.toFixed(2),
      totalReturn: (((balance - this.initialBalance) / this.initialBalance) * 100).toFixed(2)
    };
  }

  calculateMetrics(trades) {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        profitFactor: 0,
        totalProfit: 0,
        totalLoss: 0,
        netProfit: 0
      };
    }

    let wins = 0, losses = 0;
    let totalProfit = 0, totalLoss = 0;

    for (const trade of trades) {
      const profit = parseFloat(trade.profit);
      if (profit > 0) {
        wins++;
        totalProfit += profit;
      } else {
        losses++;
        totalLoss += Math.abs(profit);
      }
    }

    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;

    return {
      totalTrades: trades.length,
      winRate: ((wins / trades.length) * 100).toFixed(2),
      profitFactor: profitFactor.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      totalLoss: totalLoss.toFixed(2),
      netProfit: (totalProfit - totalLoss).toFixed(2)
    };
  }
}

export default Backtester;
