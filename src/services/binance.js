// src/services/binance.js
// Menggunakan CoinGecko API (Binance API diblokir di beberapa jaringan Indonesia)

const SYMBOL_TO_COINGECKO_ID = {
  'BTCUSDT': 'bitcoin',
  'ETHUSDT': 'ethereum',
  'BNBUSDT': 'binancecoin',
  'SOLUSDT': 'solana',
  'XRPUSDT': 'ripple',
  'ADAUSDT': 'cardano',
  'DOGEUSDT': 'dogecoin',
  'AVAXUSDT': 'avalanche-2'
};

const INTERVAL_TO_DAYS = {
  '1h': 1,
  '4h': 7,
  '1d': 30
};

export async function fetchBinanceData(symbol = 'BTCUSDT', interval = '1h', limit = 300) {
  const coinId = SYMBOL_TO_COINGECKO_ID[symbol] || 'bitcoin';
  const days = INTERVAL_TO_DAYS[interval] || 1;

  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);

  const data = await response.json();

  return data.map(candle => ({
    time: candle[0],
    open: candle[1],
    high: candle[2],
    low: candle[3],
    close: candle[4],
    volume: 0
  })).slice(-limit);
}
