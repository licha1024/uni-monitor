import { fetchMarketData, fetchCrossMarket } from './market.js';
import { fetchProtocolData } from './protocol.js';
import { fetchOnChainData } from './onchain.js';
import { fetchDerivatives } from './derivatives.js';
import { fetchGovernance } from './governance.js';
import type { UniSnapshot } from '../types/snapshot.js';

export async function collectSnapshot(): Promise<UniSnapshot> {
  const errors: string[] = [];
  const now = new Date();

  // Independent fetches run in parallel
  const [market, protocol, onChain, derivatives, governance] = await Promise.all([
    fetchMarketData(errors),
    fetchProtocolData(errors),
    fetchOnChainData(errors),
    fetchDerivatives(errors),
    fetchGovernance(errors),
  ]);

  // Cross-market depends on market price
  const crossMarket = await fetchCrossMarket(market.priceUsd, errors);

  return {
    timestamp: now.toISOString(),
    dateISO: now.toISOString().split('T')[0],
    market,
    protocol,
    onChain,
    derivatives,
    crossMarket,
    governance,
    errors,
  };
}
