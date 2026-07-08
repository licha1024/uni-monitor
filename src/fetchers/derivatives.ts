import { BINANCE_FUTURES_API } from '../util/constants.js';
import { safeGet } from '../util/http.js';
import type { DerivativesData } from '../types/snapshot.js';

interface BinancePremium {
  symbol: string;
  markPrice: string;
  lastFundingRate: string;
}

interface BinanceOI {
  symbol: string;
  openInterest: string;
}

interface BinanceLongShort {
  symbol: string;
  longShortRatio: string;
  longAccount: string;
  shortAccount: string;
  timestamp: number;
}

export async function fetchDerivatives(errors: string[]): Promise<DerivativesData> {
  const symbol = 'UNIUSDT';

  const [premium, oi, longShort] = await Promise.all([
    safeGet<BinancePremium>(
      `${BINANCE_FUTURES_API}/premiumIndex?symbol=${symbol}`,
      {},
      errors,
      'binance:premium'
    ),
    safeGet<BinanceOI>(
      `${BINANCE_FUTURES_API}/openInterest?symbol=${symbol}`,
      {},
      errors,
      'binance:oi'
    ),
    safeGet<BinanceLongShort[]>(
      `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1d&limit=1`,
      {},
      errors,
      'binance:longshort'
    ),
  ]);

  const mark = premium ? parseFloat(premium.markPrice) : null;
  const oiRaw = oi ? parseFloat(oi.openInterest) : null;
  const oiUsd = mark && oiRaw ? mark * oiRaw : null;

  const fundingRate = premium
    ? parseFloat(premium.lastFundingRate) * 100
    : null;

  const lsRatio =
    Array.isArray(longShort) && longShort.length > 0
      ? parseFloat(longShort[0].longShortRatio)
      : null;

  return {
    openInterestUsd: oiUsd,
    fundingRatePct: fundingRate,
    longShortRatio: lsRatio,
    liquidations24hUsd: null, // Binance liq stream requires WS; deferred
  };
}
