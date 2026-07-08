import { COINGECKO_API } from '../util/constants.js';
import { safeGet, pct } from '../util/http.js';
import type { MarketData, CrossMarket } from '../types/snapshot.js';

// ---------- Binance spot (most reliable primary source) ----------
interface BinanceTicker24h {
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
  openPrice: string;
}

interface BinanceKline {
  0: number; // openTime
  1: string; // open
  2: string; // high
  3: string; // low
  4: string; // close
  5: string; // volume
}

async function fetchBinanceSpot(errors: string[]) {
  const [ticker, klines] = await Promise.all([
    safeGet<BinanceTicker24h>(
      'https://api.binance.com/api/v3/ticker/24hr?symbol=UNIUSDT',
      {},
      errors,
      'binance:ticker'
    ),
    // 8 daily candles -> 7-day change
    safeGet<BinanceKline[]>(
      'https://api.binance.com/api/v3/klines?symbol=UNIUSDT&interval=1d&limit=8',
      {},
      errors,
      'binance:klines'
    ),
  ]);

  const price = ticker ? parseFloat(ticker.lastPrice) : null;
  const change24h = ticker ? parseFloat(ticker.priceChangePercent) : null;
  const volume24h = ticker ? parseFloat(ticker.quoteVolume) : null;

  let change7d: number | null = null;
  if (Array.isArray(klines) && klines.length >= 8 && price != null) {
    const price7dAgo = parseFloat(klines[0][4]); // close of 7 days ago
    change7d = pct(price, price7dAgo);
  }

  return { price, change24h, change7d, volume24h };
}

// ---------- CoinGecko (fallback + market cap / FDV / ATH) ----------
interface CGResponse {
  market_data: {
    current_price: { usd: number };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    total_volume: { usd: number };
    market_cap: { usd: number };
    fully_diluted_valuation: { usd: number };
    ath: { usd: number };
    ath_change_percentage: { usd: number };
  };
}

export async function fetchMarketData(errors: string[]): Promise<MarketData> {
  // Fire both in parallel; whichever succeeds first fills the gap
  const [binance, cg] = await Promise.all([
    fetchBinanceSpot(errors),
    safeGet<CGResponse>(
      `${COINGECKO_API}/coins/uniswap?localization=false&tickers=false&community_data=false&developer_data=false`,
      {},
      errors,
      'coingecko:uniswap'
    ),
  ]);

  const md = cg?.market_data;

  // Prefer Binance for spot metrics (more reliable from CI runners);
  // fall back to CoinGecko field-by-field.
  return {
    priceUsd: binance.price ?? md?.current_price?.usd ?? null,
    priceChange24hPct: binance.change24h ?? md?.price_change_percentage_24h ?? null,
    priceChange7dPct: binance.change7d ?? md?.price_change_percentage_7d ?? null,
    volume24hUsd: binance.volume24h ?? md?.total_volume?.usd ?? null,
    marketCapUsd: md?.market_cap?.usd ?? null,
    fdvUsd: md?.fully_diluted_valuation?.usd ?? null,
    ath: md?.ath?.usd ?? null,
    athChangePct: md?.ath_change_percentage?.usd ?? null,
  };
}

interface CGGlobal {
  data: {
    market_cap_percentage: { btc: number };
    total_market_cap: { usd: number };
  };
}

interface CGSimplePrice {
  ethereum?: { usd: number };
}

export async function fetchCrossMarket(
  uniPrice: number | null,
  errors: string[]
): Promise<CrossMarket> {
  const [eth, global] = await Promise.all([
    safeGet<CGSimplePrice>(
      `${COINGECKO_API}/simple/price?ids=ethereum&vs_currencies=usd`,
      {},
      errors,
      'coingecko:eth'
    ),
    safeGet<CGGlobal>(`${COINGECKO_API}/global`, {}, errors, 'coingecko:global'),
  ]);

  const ethPrice = eth?.ethereum?.usd ?? null;
  const uniEth = ethPrice && uniPrice ? uniPrice / ethPrice : null;

  const defiLlama = await safeGet<{ totalLiquidityUSD?: number; tvl?: number }[]>(
    `https://api.llama.fi/v2/chains`,
    {},
    errors,
    'defillama:chains'
  );
  const totalDefi = Array.isArray(defiLlama)
    ? defiLlama.reduce((acc, c) => acc + (c.tvl ?? 0), 0)
    : null;

  return {
    ethPriceUsd: ethPrice,
    uniEthRatio: uniEth,
    btcDominance: global?.data?.market_cap_percentage?.btc ?? null,
    defiTvlUsd: totalDefi,
  };
}
