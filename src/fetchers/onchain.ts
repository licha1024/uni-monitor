import { createPublicClient, http, erc20Abi, formatUnits, type PublicClient } from 'viem';
import { mainnet } from 'viem/chains';
import { config } from '../util/config.js';
import {
  UNI_TOKEN_ADDRESS,
  BURN_ADDRESS,
  ZERO_ADDRESS,
  UNISWAP_TIMELOCK,
} from '../util/constants.js';
import type { OnChainData } from '../types/snapshot.js';

// Public mainnet RPCs that don't require auth. First = user-configured or
// publicnode default; the rest are fallbacks tried in order if the primary fails.
const RPC_URLS = [
  config.ethRpcUrl,
  'https://eth.llamarpc.com',
  'https://rpc.ankr.com/eth',
  'https://cloudflare-eth.com',
  'https://eth.drpc.org',
].filter((u, i, arr) => u && arr.indexOf(u) === i);

function makeClient(url: string): PublicClient {
  return createPublicClient({
    chain: mainnet,
    transport: http(url, { timeout: 15_000, retryCount: 1 }),
  }) as PublicClient;
}

/**
 * Call a viem read across RPCs; first successful result wins.
 * Prevents a single flaky RPC from wiping out an entire on-chain fetch.
 */
async function readWithFallback<T>(
  read: (client: PublicClient) => Promise<T>,
  label: string
): Promise<T | null> {
  for (const url of RPC_URLS) {
    try {
      return await read(makeClient(url));
    } catch (err) {
      // silent per-RPC failure; try the next one
      const _msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.warn(`[onchain] ${label} via ${new URL(url).host} failed: ${_msg}`);
    }
  }
  return null;
}

async function balanceOf(address: `0x${string}`): Promise<number | null> {
  const raw = await readWithFallback(
    (c) =>
      c.readContract({
        address: UNI_TOKEN_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      }),
    `balanceOf(${address.slice(0, 8)}…)`
  );
  return raw == null ? null : parseFloat(formatUnits(raw as bigint, 18));
}

async function totalSupplyOnChain(): Promise<number | null> {
  const raw = await readWithFallback(
    (c) =>
      c.readContract({
        address: UNI_TOKEN_ADDRESS,
        abi: erc20Abi,
        functionName: 'totalSupply',
      }),
    'totalSupply'
  );
  return raw == null ? null : parseFloat(formatUnits(raw as bigint, 18));
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
