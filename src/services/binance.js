// src/services/binance.js
// Menggunakan Indodax API (exchange lokal Indonesia, tidak diblokir ISP)

const SYMBOL_TO_INDODAX_PAIR = {
  'BTCUSDT': 'btcidr',
  'ETHUSDT': 'ethidr',
  'BNBUSDT': 'bnbidr',
  'SOLUSDT': 'solidr',
  'XRPUSDT': 'xrpidr',
  'ADAUSDT': 'adaidr',
  'DOGEUSDT': 'dogeidr',
  'AVAXUSDT': 'avaxidr'
};

const INTERVAL_TO_TF = {
  '1h': '60',
  '4h': '240',
  '1d': '1D'
};

const INTERVAL_TO_SECONDS_BACK = {
  '1h': 30 * 24 * 60 * 60,   // 30 hari
  '4h': 90 * 24 * 60 * 60,   // 90 hari
  '1d': 365 * 24 * 60 * 60   // 1 tahun
};

export async function fetchBinanceData(symbol = 'BTCUSDT', interval = '1h', limit = 300) {
  const pair = SYMBOL_TO_INDODAX_PAIR[symbol] || 'btcidr';
  const tf = INTERVAL_TO_TF[interval] || '60';
  const secondsBack = INTERVAL_TO_SECONDS_BACK[interval] || 30 * 24 * 60 * 60;

  const to = Math.floor(Date.now() / 1000);
  const from = to - secondsBack;

  const url = `https://indodax.com/tradingview/history_v2?from=${from}&to=${to}&symbol=${pair}&tf=${tf}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Indodax API error: ${response.status}`);

  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Data tidak valid dari Indodax');

  return data.map(candle => ({
    time: candle.Time * 1000,
    open: parseFloat(candle.Open),
    high: parseFloat(candle.High),
    low: parseFloat(candle.Low),
    close: parseFloat(candle.Close),
    volume: parseFloat(candle.Volume)
  })).slice(-limit);
}
