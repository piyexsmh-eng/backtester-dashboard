// api/binance.js
// Vercel Serverless Function - proxy ke Binance API
// Ini jalan di server Vercel (bukan browser), jadi tidak kena blokir ISP lokal

export default async function handler(req, res) {
  const { symbol = 'BTCUSDT', interval = '1h', limit = 300 } = req.query;

  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ error: `Binance API error: ${response.status}` });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
