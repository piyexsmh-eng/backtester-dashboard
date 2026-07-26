// api/binance.js
// Vercel Serverless Function - proxy ke KuCoin API

export default async function handler(req, res) {
  const { symbol = 'BTCUSDT', interval = '1h', limit = 300 } = req.query;

  // Convert symbol format: BTCUSDT -> BTC-USDT
  const kucoinSymbol = symbol.replace('USDT', '-USDT');

  // Convert interval format
  const intervalMap = { '1h': '1hour', '4h': '4hour', '1d': '1day' };
  const kucoinInterval = intervalMap[interval] || '1hour';

  try {
    const url = `https://api.kucoin.com/api/v1/market/candles?type=${kucoinInterval}&symbol=${kucoinSymbol}&limit=${limit}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ error: `KuCoin API error: ${response.status}` });
    }

    const json = await response.json();
    if (json.code !== '200000') {
      return res.status(500).json({ error: `KuCoin error: ${json.msg || json.code}` });
    }

    res.status(200).json(json.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
