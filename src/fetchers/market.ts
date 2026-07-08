import { COINGECKO_API } from '../util/constants.js';
import { safeGet } from '../util/http.js';
import type { MarketData, CrossMarket } from '../types/snapshot.js';

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
  const data = await safeGet<CGResponse>(
    `${COINGECKO_API}/coins/uniswap?localization=false&tickers=false&community_data=false&developer_data=false`,
    {},
    errors,
    'coingecko:uniswap'
  );
  if (!data) {
    return {
      priceUsd: null,
      priceChange24hPct: null,
      priceChange7dPct: null,
      volume24hUsd: null,
      marketCapUsd: null,
      fdvUsd: null,
      ath: null,
      athChangePct: null,
    };
  }
  const md = data.market_data;
  return {
    priceUsd: md.current_price?.usd ?? null,
    priceChange24hPct: md.price_change_percentage_24h ?? null,
    priceChange7dPct: md.price_change_percentage_7d ?? null,
    volume24hUsd: md.total_volume?.usd ?? null,
    marketCapUsd: md.market_cap?.usd ?? null,
    fdvUsd: md.fully_diluted_valuation?.usd ?? null,
    ath: md.ath?.usd ?? null,
    athChangePct: md.ath_change_percentage?.usd ?? null,
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
