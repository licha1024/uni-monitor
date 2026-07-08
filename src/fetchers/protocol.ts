import { DEFILLAMA_API } from '../util/constants.js';
import { safeGet, pct } from '../util/http.js';
import type { ProtocolData } from '../types/snapshot.js';

interface LlamaProtocol {
  tvl?: Array<{ date: number; totalLiquidityUSD: number }>;
  currentChainTvls?: Record<string, number>;
}

interface LlamaFees {
  total24h?: number;
  total7d?: number;
  totalDataChart?: Array<[number, number]>;
}

export async function fetchProtocolData(errors: string[]): Promise<ProtocolData> {
  // TVL history
  const tvlData = await safeGet<LlamaProtocol>(
    `${DEFILLAMA_API}/protocol/uniswap`,
    {},
    errors,
    'defillama:uniswap-tvl'
  );

  let tvlUsd: number | null = null;
  let tvlChange7dPct: number | null = null;
  if (tvlData?.tvl && Array.isArray(tvlData.tvl) && tvlData.tvl.length > 0) {
    const arr = tvlData.tvl;
    tvlUsd = arr[arr.length - 1]?.totalLiquidityUSD ?? null;
    const idx7 = arr.length - 8;
    if (idx7 >= 0 && tvlUsd) {
      tvlChange7dPct = pct(tvlUsd, arr[idx7].totalLiquidityUSD);
    }
  }

  // Fees & revenue (protocol-wide)
  const fees = await safeGet<LlamaFees>(
    `${DEFILLAMA_API}/summary/fees/uniswap?dataType=dailyFees`,
    {},
    errors,
    'defillama:uniswap-fees'
  );
  const revenue = await safeGet<LlamaFees>(
    `${DEFILLAMA_API}/summary/fees/uniswap?dataType=dailyRevenue`,
    {},
    errors,
    'defillama:uniswap-revenue'
  );

  // Unichain TVL (if listed as separate chain)
  let unichainTvl: number | null = null;
  const chains = await safeGet<Array<{ name?: string; tvl?: number }>>(
    `${DEFILLAMA_API}/v2/chains`,
    {},
    errors,
    'defillama:chains'
  );
  if (Array.isArray(chains)) {
    const uni = chains.find(
      (c) => (c.name ?? '').toLowerCase() === 'unichain'
    );
    unichainTvl = uni?.tvl ?? null;
  }

  return {
    tvlUsd,
    tvlChange7dPct,
    fees24hUsd: fees?.total24h ?? null,
    fees7dUsd: fees?.total7d ?? null,
    revenue24hUsd: revenue?.total24h ?? null,
    revenue7dUsd: revenue?.total7d ?? null,
    unichainTvlUsd: unichainTvl,
  };
}
