export interface MarketData {
  priceUsd: number | null;
  priceChange24hPct: number | null;
  priceChange7dPct: number | null;
  volume24hUsd: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  ath: number | null;
  athChangePct: number | null;
}

export interface ProtocolData {
  tvlUsd: number | null;
  tvlChange7dPct: number | null;
  fees24hUsd: number | null;
  fees7dUsd: number | null;
  revenue24hUsd: number | null;
  revenue7dUsd: number | null;
  unichainTvlUsd: number | null;
}

export interface OnChainData {
  totalSupply: number | null;
  circulatingSupply: number | null;
  burnedTotal: number | null;
  treasuryBalance: number | null;
  top10ConcentrationPct: number | null;
  newBurns24h: number | null;
}

export interface DerivativesData {
  openInterestUsd: number | null;
  fundingRatePct: number | null;
  longShortRatio: number | null;
  liquidations24hUsd: number | null;
}

export interface CrossMarket {
  ethPriceUsd: number | null;
  uniEthRatio: number | null;
  btcDominance: number | null;
  defiTvlUsd: number | null;
}

export interface GovernanceData {
  activeProposals: Array<{ title: string; status: string; url: string }>;
  recentDiscussion: string[];
}

export interface UniSnapshot {
  timestamp: string;
  dateISO: string;
  market: MarketData;
  protocol: ProtocolData;
  onChain: OnChainData;
  derivatives: DerivativesData;
  crossMarket: CrossMarket;
  governance: GovernanceData;
  errors: string[];
}

export interface Bilingual {
  en: string;
  zh: string;
}

export interface DailyAnalysis {
  headline: Bilingual;
  stance: 'bullish' | 'neutral' | 'bearish';
  confidence: 'low' | 'medium' | 'high';
  keyChanges: Bilingual[];
  contrarianObservation: Bilingual;
  watchNext: Bilingual[];
  fullReasoning: Bilingual;
}
