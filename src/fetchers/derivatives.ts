import { safeGet } from '../util/http.js';
import type { DerivativesData } from '../types/snapshot.js';

// Bybit v5: works from GitHub-hosted runners (Binance returns 451).
// Endpoint returns funding, mark, and open interest for the perp.
interface BybitTickerResponse {
  result?: {
    list?: Array<{
      symbol: string;
      markPrice: string;
      lastPrice: string;
      openInterest: string;      // in contracts
      openInterestValue: string; // in USD (v5 gives this directly)
      fundingRate: string;
    }>;
  };
}

interface BybitLongShortResponse {
  result?: {
    list?: Array<{
      buyRatio: string;
      sellRatio: string;
      timestamp: string;
    }>;
  };
}

export async function fetchDerivatives(errors: string[]): Promise<DerivativesData> {
  const [ticker, longShort] = await Promise.all([
    safeGet<BybitTickerResponse>(
      'https://api.bybit.com/v5/market/tickers?category=linear&symbol=UNIUSDT',
      {},
      errors,
      'bybit:ticker'
    ),
    safeGet<BybitLongShortResponse>(
      'https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=UNIUSDT&period=1d&limit=1',
      {},
      errors,
      'bybit:longshort'
    ),
  ]);

  const t = ticker?.result?.list?.[0];
  const openInterestUsd = t?.openInterestValue ? parseFloat(t.openInterestValue) : null;
  const fundingRatePct = t?.fundingRate ? parseFloat(t.fundingRate) * 100 : null;

  const ls = longShort?.result?.list?.[0];
  const buy = ls?.buyRatio ? parseFloat(ls.buyRatio) : null;
  const sell = ls?.sellRatio ? parseFloat(ls.sellRatio) : null;
  const longShortRatio = buy != null && sell != null && sell > 0 ? buy / sell : null;

  return {
    openInterestUsd,
    fundingRatePct,
    longShortRatio,
    liquidations24hUsd: null, // needs paid data source
  };
}
