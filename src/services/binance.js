// src/services/binance.js
export async function fetchBinanceData(symbol = 'BTCUSDT', interval = '1h', limit = 300) {
  const baseUrl = 'https://api.binance.com/api/v3/klines';
  const url = `${baseUrl}?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Binance API error: ${response.status}`);
  
  const data = await response.json();
  return data.map(candle => ({
    time: candle[0],               // Open time (ms)
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[5])
  }));
}
