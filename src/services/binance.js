// src/services/binance.js
// Menggunakan CoinGecko market_chart API (data per jam, lebih banyak history)

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

// Berapa hari data yang diambil, per pilihan interval
const INTERVAL_TO_DAYS = {
  '1h': 7,
  '4h': 30,
  '1d': 90
};

// Berapa jam digabung jadi 1 candle, per pilihan interval
const INTERVAL_TO_HOURS = {
  '1h': 1,
  '4h': 4,
  '1d': 24
};

export async function fetchBinanceData(symbol = 'BTCUSDT', interval = '1h', limit = 300) {
  const coinId = SYMBOL_TO_COINGECKO_ID[symbol] || 'bitcoin';
  const days = INTERVAL_TO_DAYS[interval] || 7;
  const groupHours = INTERVAL_TO_HOURS[interval] || 1;

  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);

  const json = await response.json();
  const prices = json.prices; // array of [timestamp, price]

  const msPerGroup = groupHours * 60 * 60 * 1000;
  const candles = [];
  let currentGroupKey = null;
  let currentGroup = [];

  for (const [timestamp, price] of prices) {
    const groupKey = Math.floor(timestamp / msPerGroup) * msPerGroup;
    if (currentGroupKey === null) currentGroupKey = groupKey;

    if (groupKey !== currentGroupKey) {
      candles.push({
        time: currentGroupKey,
        open: currentGroup[0],
        high: Math.max(...currentGroup),
        low: Math.min(...currentGroup),
        close: currentGroup[currentGroup.length - 1],
        volume: 0
      });
      currentGroup = [];
      currentGroupKey = groupKey;
    }
    currentGroup.push(price);
  }

  if (currentGroup.length > 0) {
    candles.push({
      time: currentGroupKey,
      open: currentGroup[0],
      high: Math.max(...currentGroup),
      low: Math.min(...currentGroup),
      close: currentGroup[currentGroup.length - 1],
      volume: 0
    });
  }

  return candles.slice(-limit);
}
