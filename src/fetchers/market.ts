import { COINGECKO_API } from '../util/constants.js';
import { safeGet, pct } from '../util/http.js';
import type { MarketData, CrossMarket } from '../types/snapshot.js';

// ---------- OKX spot (works from GH runners; Binance 451, Bybit 403) ----------
interface OKXTickerResponse {
  code: string;
  data: Array<{
    instId: string;
    last: string;
    open24h: string;
    vol24h: string;    // in base currency (UNI)
    volCcy24h: string; // in quote currency (USDT) — this is $ volume
  }>;
}

interface OKXCandleResponse {
  code: string;
  // [ts, open, high, low, close, vol, volCcy, volCcyQuote, confirm]
  data: string[][];
}

async function fetchOkxSpot(errors: string[]) {
  const [ticker, candles] = await Promise.all([
    safeGet<OKXTickerResponse>(
      'https://www.okx.com/api/v5/market/ticker?instId=UNI-USDT',
      {},
      errors,
      'okx:spot-ticker'
    ),
    // Daily candles; 8 rows -> use oldest close to compute 7d change
    safeGet<OKXCandleResponse>(
      'https://www.okx.com/api/v5/market/candles?instId=UNI-USDT&bar=1D&limit=8',
      {},
      errors,
      'okx:spot-candles'
    ),
  ]);

  const t = ticker?.data?.[0];
  const price = t?.last ? parseFloat(t.last) : null;
  const open24 = t?.open24h ? parseFloat(t.open24h) : null;
  const change24h =
    price != null && open24 != null && open24 > 0
      ? ((price - open24) / open24) * 100
      : null;
  const volume24h = t?.volCcy24h ? parseFloat(t.volCcy24h) : null;

  // OKX returns newest-first. Last element is oldest close.
  let change7d: number | null = null;
  const rows = candles?.data;
  if (Array.isArray(rows) && rows.length >= 8 && price != null) {
    const price7dAgo = parseFloat(rows[rows.length - 1][4]);
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
  const [okx, cg] = await Promise.all([
    fetchOkxSpot(errors),
    safeGet<CGResponse>(
      `${COINGECKO_API}/coins/uniswap?localization=false&tickers=false&community_data=false&developer_data=false`,
      {},
      errors,
      'coingecko:uniswap'
    ),
  ]);

  const md = cg?.market_data;

  // Prefer OKX for real-time spot metrics (Binance 451, Bybit 403 from CI);
  // CoinGecko for slower-moving stats (market cap, FDV, ATH) and fallback.
  return {
    priceUsd: okx.price ?? md?.current_price?.usd ?? null,
    priceChange24hPct: okx.change24h ?? md?.price_change_percentage_24h ?? null,
    priceChange7dPct: okx.change7d ?? md?.price_change_percentage_7d ?? null,
    volume24hUsd: okx.volume24h ?? md?.total_volume?.usd ?? null,
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
