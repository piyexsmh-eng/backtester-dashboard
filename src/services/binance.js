// src/services/binance.js
// Fetch data via Vercel Serverless Function proxy (menghindari blokir ISP ke Binance)

export async function fetchBinanceData(symbol = 'BTCUSDT', interval = '1h', limit = 300) {
  const url = `/api/binance?symbol=${symbol}&interval=${interval}&limit=${limit}`;

  const response = await fetch(url);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Proxy error: ${response.status}`);
  }

  const data = await response.json();

  return data.map(candle => ({
    time: candle[0],
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[5])
  }));
}
