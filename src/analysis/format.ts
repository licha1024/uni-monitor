import type { UniSnapshot } from '../types/snapshot.js';

// Format numbers deterministically to keep prompt cache stable
function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null || !isFinite(n)) return 'n/a';
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(decimals);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return 'n/a';
  const s = n >= 0 ? '+' : '';
  return `${s}${n.toFixed(2)}%`;
}

function fmtNum(n: number | null | undefined, decimals = 0): string {
  if (n == null || !isFinite(n)) return 'n/a';
  return n.toLocaleString('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  });
}

export function renderSnapshotForAI(snap: UniSnapshot): string {
  const emissionAnnual = 20_000_000; // 20M/year per UNIfication budget

  // Compute net inflation vs. burn (annualized from 7d fees)
  const annualRevenue =
    snap.protocol.revenue7dUsd != null
      ? snap.protocol.revenue7dUsd * (365 / 7)
      : null;
  const annualBurnUsd = annualRevenue != null ? annualRevenue * 0.17 : null;
  const annualBurnUni =
    annualBurnUsd != null && snap.market.priceUsd
      ? annualBurnUsd / snap.market.priceUsd
      : null;
  const netEmissionUni =
    annualBurnUni != null ? emissionAnnual - annualBurnUni : null;

  return `# UNI SNAPSHOT — ${snap.dateISO}

## 1. Market
- Price: $${fmt(snap.market.priceUsd, 4)}
- 24h change: ${fmtPct(snap.market.priceChange24hPct)}
- 7d change: ${fmtPct(snap.market.priceChange7dPct)}
- 24h volume: ${fmt(snap.market.volume24hUsd)}
- Market cap: ${fmt(snap.market.marketCapUsd)}
- FDV: ${fmt(snap.market.fdvUsd)}
- ATH: $${fmt(snap.market.ath, 2)} (${fmtPct(snap.market.athChangePct)} from ATH)

## 2. Protocol (Uniswap DEX)
- TVL: ${fmt(snap.protocol.tvlUsd)}
- TVL 7d change: ${fmtPct(snap.protocol.tvlChange7dPct)}
- Fees 24h: ${fmt(snap.protocol.fees24hUsd)}
- Fees 7d: ${fmt(snap.protocol.fees7dUsd)}
- Protocol revenue 24h: ${fmt(snap.protocol.revenue24hUsd)}
- Protocol revenue 7d: ${fmt(snap.protocol.revenue7dUsd)}
- Unichain TVL: ${fmt(snap.protocol.unichainTvlUsd)}

## 3. On-Chain
- Total supply: ${fmtNum(snap.onChain.totalSupply)} UNI
- Circulating: ${fmtNum(snap.onChain.circulatingSupply)} UNI
- Burned to dead addresses: ${fmtNum(snap.onChain.burnedTotal)} UNI
- Treasury (Timelock) balance: ${fmtNum(snap.onChain.treasuryBalance)} UNI

## 4. Supply Dynamics — THE CRITICAL METRIC
- Fixed annual emission: ${fmtNum(emissionAnnual)} UNI
- Annualized protocol revenue: ${fmt(annualRevenue)}
- Annualized buyback budget (17% of revenue): ${fmt(annualBurnUsd)}
- Annualized UNI burned at current price: ${fmtNum(annualBurnUni)} UNI
- **NET EMISSION (emission − burn): ${fmtNum(netEmissionUni)} UNI/year**
- Verdict: ${
    netEmissionUni == null
      ? 'insufficient data'
      : netEmissionUni > 0
      ? `still net INFLATIONARY (+${((netEmissionUni / (snap.onChain.circulatingSupply ?? 1e9)) * 100).toFixed(2)}%/yr)`
      : `net DEFLATIONARY (${((netEmissionUni / (snap.onChain.circulatingSupply ?? 1e9)) * 100).toFixed(2)}%/yr)`
  }

## 5. Derivatives (Binance UNIUSDT perp)
- Open Interest: ${fmt(snap.derivatives.openInterestUsd)}
- Funding rate: ${fmtPct(snap.derivatives.fundingRatePct)}
- Long/Short account ratio: ${snap.derivatives.longShortRatio ?? 'n/a'}

## 6. Cross-Market Context
- ETH price: $${fmt(snap.crossMarket.ethPriceUsd, 2)}
- UNI/ETH ratio: ${snap.crossMarket.uniEthRatio?.toFixed(6) ?? 'n/a'}
- BTC dominance: ${fmtPct(snap.crossMarket.btcDominance)}
- Total DeFi TVL: ${fmt(snap.crossMarket.defiTvlUsd)}

## 7. Governance
Active proposals:
${
  snap.governance.activeProposals.length === 0
    ? '  (none active)'
    : snap.governance.activeProposals
        .map((p) => `  - [${p.status}] ${p.title}\n    ${p.url}`)
        .join('\n')
}

Recent forum threads (top 5):
${
  snap.governance.recentDiscussion.length === 0
    ? '  (none fetched)'
    : snap.governance.recentDiscussion.map((s) => `  - ${s}`).join('\n')
}

## 8. Data fetch errors (if any)
${snap.errors.length === 0 ? '  (all clean)' : snap.errors.map((e) => `  - ${e}`).join('\n')}
`;
}
