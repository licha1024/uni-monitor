import { safeGet } from '../util/http.js';
import type { DerivativesData } from '../types/snapshot.js';

// OKX v5 public API. Instrument IDs:
//   Perpetual swap USDT-margined: UNI-USDT-SWAP
//   Spot:                          UNI-USDT
// OKX consistently works from GitHub-hosted runners (Binance 451,
// Bybit 403 in current tests).
interface OKXResponse<T> {
  code: string;
  msg: string;
  data: T[];
}

interface OKXFundingRate {
  instId: string;
  fundingRate: string;    // decimal, not percent (e.g. "0.0001" = 0.01%)
  nextFundingRate: string;
}

interface OKXOpenInterest {
  instId: string;
  oi: string;    // in contracts
  oiCcy: string; // in base currency (UNI)
  oiUsd: string; // in USD (available on v5)
  ts: string;
}

interface OKXLongShortRatio {
  ts: string;
  longShortRatio: string;   // ratio value
  longShortAcctRatio?: string;
}

export async function fetchDerivatives(errors: string[]): Promise<DerivativesData> {
  const instId = 'UNI-USDT-SWAP';

  const [funding, oi, ls] = await Promise.all([
    safeGet<OKXResponse<OKXFundingRate>>(
      `https://www.okx.com/api/v5/public/funding-rate?instId=${instId}`,
      {},
      errors,
      'okx:funding'
    ),
    safeGet<OKXResponse<OKXOpenInterest>>(
      `https://www.okx.com/api/v5/public/open-interest?instId=${instId}`,
      {},
      errors,
      'okx:oi'
    ),
    // Global long/short ratio (account-weighted) for UNI. period=1D.
    safeGet<OKXResponse<[string, string]>>(
      `https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=UNI&period=1D`,
      {},
      errors,
      'okx:longshort'
    ),
  ]);

  const fundingRow = funding?.data?.[0];
  const fundingRatePct = fundingRow?.fundingRate
    ? parseFloat(fundingRow.fundingRate) * 100
    : null;

  const oiRow = oi?.data?.[0];
  const openInterestUsd = oiRow?.oiUsd ? parseFloat(oiRow.oiUsd) : null;

  // The Rubik endpoint returns [timestamp, ratio] tuples, newest first
  const lsRow = ls?.data?.[0];
  const longShortRatio = Array.isArray(lsRow) && lsRow[1] ? parseFloat(lsRow[1]) : null;

  return {
    openInterestUsd,
    fundingRatePct,
    longShortRatio,
    liquidations24hUsd: null,
  };
}
