import { COINGECKO_API } from '../util/constants.js';
import { safeGet, pct } from '../util/http.js';
import type { MarketData, CrossMarket } from '../types/snapshot.js';

// ---------- Bybit spot (reliable from GH runners; Binance returns 451) ----------
interface BybitSpotTicker {
  result?: {
    list?: Array<{
      symbol: string;
      lastPrice: string;
      prevPrice24h: string;
      price24hPcnt: string;
      turnover24h: string; // USDT volume
    }>;
  };
}

interface BybitKlineResponse {
  result?: {
    list?: Array<[string, string, string, string, string, string, string]>;
    // [startTime, open, high, low, close, volume, turnover]
  };
}

async function fetchBybitSpot(errors: string[]) {
  const [ticker, klines] = await Promise.all([
    safeGet<BybitSpotTicker>(
      'https://api.bybit.com/v5/market/tickers?category=spot&symbol=UNIUSDT',
      {},
      errors,
      'bybit:spot-ticker'
    ),
    // 8 daily candles -> 7-day change (interval D = 1 day)
    safeGet<BybitKlineResponse>(
      'https://api.bybit.com/v5/market/kline?category=spot&symbol=UNIUSDT&interval=D&limit=8',
      {},
      errors,
      'bybit:spot-kline'
    ),
  ]);

  const t = ticker?.result?.list?.[0];
  const price = t?.lastPrice ? parseFloat(t.lastPrice) : null;
  const change24h = t?.price24hPcnt ? parseFloat(t.price24hPcnt) * 100 : null;
  const volume24h = t?.turnover24h ? parseFloat(t.turnover24h) : null;

  const list = klines?.result?.list;
  let change7d: number | null = null;
  // Bybit returns newest-first; last element is oldest
  if (Array.isArray(list) && list.length >= 8 && price != null) {
    const price7dAgo = parseFloat(list[list.length - 1][4]);
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
  const [bybit, cg] = await Promise.all([
    fetchBybitSpot(errors),
    safeGet<CGResponse>(
      `${COINGECKO_API}/coins/uniswap?localization=false&tickers=false&community_data=false&developer_data=false`,
      {},
      errors,
      'coingecko:uniswap'
    ),
  ]);

  const md = cg?.market_data;

  // Prefer Bybit for real-time spot metrics (fast + reliable from CI);
  // CoinGecko for slower-moving stats (market cap, FDV, ATH) and fallback.
  return {
    priceUsd: bybit.price ?? md?.current_price?.usd ?? null,
    priceChange24hPct: bybit.change24h ?? md?.price_change_percentage_24h ?? null,
    priceChange7dPct: bybit.change7d ?? md?.price_change_percentage_7d ?? null,
    volume24hUsd: bybit.volume24h ?? md?.total_volume?.usd ?? null,
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
