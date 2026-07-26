// src/services/binance.js
// Fetch data via Vercel Serverless Function proxy (KuCoin)

export async function fetchBinanceData(symbol = 'BTCUSDT', interval = '1h', limit = 300) {
  const url = `/api/binance?symbol=${symbol}&interval=${interval}&limit=${limit}`;

  const response = await fetch(url);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Proxy error: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Format data tidak valid');

  // KuCoin format: [time, open, close, high, low, volume, turnover]
  // Data KuCoin urutannya dari TERBARU ke TERLAMA, jadi perlu di-reverse
  return data
    .map(candle => ({
      time: parseInt(candle[0]) * 1000,
      open: parseFloat(candle[1]),
      close: parseFloat(candle[2]),
      high: parseFloat(candle[3]),
      low: parseFloat(candle[4]),
      volume: parseFloat(candle[5])
    }))
    .reverse();
}
