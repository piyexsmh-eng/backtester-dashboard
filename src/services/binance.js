// src/services/binance.js
// Proxy via Replit server (karena Vercel/US kena blokir Binance 451)

const REPLIT_PROXY_URL = 'https://6f508078-a909-4230-951d-26e81d0290e6-00-2gzn7zh2cdzdx.pike.replit.dev';

export async function fetchBinanceData(symbol = 'BTCUSDT', interval = '1h', limit = 300) {
  const url = `${REPLIT_PROXY_URL}/api/binance?symbol=${symbol}&interval=${interval}&limit=${limit}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Proxy error: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Format data tidak valid');

  return data.map(candle => ({
    time: candle[0],
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[5])
  }));
}
