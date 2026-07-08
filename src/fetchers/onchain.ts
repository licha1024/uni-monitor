import { createPublicClient, http, erc20Abi, formatUnits } from 'viem';
import { mainnet } from 'viem/chains';
import { config } from '../util/config.js';
import {
  UNI_TOKEN_ADDRESS,
  BURN_ADDRESS,
  ZERO_ADDRESS,
  UNISWAP_TIMELOCK,
} from '../util/constants.js';
import type { OnChainData } from '../types/snapshot.js';

const client = createPublicClient({
  chain: mainnet,
  transport: http(config.ethRpcUrl),
});

async function balanceOf(address: `0x${string}`): Promise<number | null> {
  try {
    const raw = await client.readContract({
      address: UNI_TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    });
    return parseFloat(formatUnits(raw as bigint, 18));
  } catch {
    return null;
  }
}

async function totalSupplyOnChain(): Promise<number | null> {
  try {
    const raw = await client.readContract({
      address: UNI_TOKEN_ADDRESS,
      abi: erc20Abi,
      functionName: 'totalSupply',
    });
    return parseFloat(formatUnits(raw as bigint, 18));
  } catch {
    return null;
  }
}

export async function fetchOnChainData(errors: string[]): Promise<OnChainData> {
  const [totalSupply, burnedDead, burnedZero, treasury] = await Promise.all([
    totalSupplyOnChain(),
    balanceOf(BURN_ADDRESS),
    balanceOf(ZERO_ADDRESS),
    balanceOf(UNISWAP_TIMELOCK),
  ]);

  const burnedTotal =
    (burnedDead ?? 0) + (burnedZero ?? 0) || null;

  // Circulating = totalSupply - burned (rough proxy)
  const circulating =
    totalSupply != null && burnedTotal != null
      ? totalSupply - burnedTotal
      : totalSupply;

  if (totalSupply == null) {
    errors.push('onchain: totalSupply read failed');
  }

  return {
    totalSupply,
    circulatingSupply: circulating,
    burnedTotal,
    treasuryBalance: treasury,
    top10ConcentrationPct: null, // Requires Etherscan holder API (paid tier)
    newBurns24h: null, // Requires log scanning; deferred to Layer 1
  };
}
