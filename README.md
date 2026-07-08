# uni-monitor

Daily UNI (Uniswap) intelligence brief. Aggregates 8 data dimensions and synthesizes a one-page decision-oriented report via Claude Opus 4.7 with adaptive thinking. CLI-first; ships as an email + Telegram push in under 60 seconds.

## What it monitors

- **Market**: price, 24h/7d change, volume, market cap, FDV, ATH distance
- **Protocol**: TVL, fees, protocol revenue (7d/24h), Unichain TVL
- **On-chain**: total supply, treasury balance, burn address balances (deflation tracking)
- **Supply dynamics**: **net inflation** — the critical metric (annualized burn vs. 20M/year emission)
- **Derivatives**: OI, funding rate, long/short ratio (Binance UNIUSDT perp)
- **Cross-market**: ETH price, UNI/ETH ratio, BTC dominance, total DeFi TVL
- **Governance**: active Snapshot proposals + recent forum discussion
- **AI synthesis**: bullish/neutral/bearish stance, confidence, 3 key changes, forced contrarian observation, watch-next

## Setup

```bash
cp .env.example .env
# fill in ANTHROPIC_API_KEY (required) and any notification channels you want
npm install
```

## Usage

```bash
# Just print to stdout (no notifications, no save)
npm run run:dry

# Save today's snapshot to data/snapshots/YYYY-MM-DD.json
npm run run:save

# Full pipeline: collect + analyze + send + save
npm run run:send

# Raw data only (no AI, for debugging)
npx tsx src/index.ts --fetch-only
```

## Cron

```
# Every day 08:15 local time
15 8 * * * cd /path/to/uni-monitor && /usr/local/bin/npm run run:send >> logs/daily.log 2>&1
```

## Architecture

```
src/
├── fetchers/       # 5 parallel data fetchers, all with graceful fallback
├── analysis/       # Opus 4.7 synthesis with adaptive thinking + prompt caching
├── notify/         # email, telegram, snapshot storage
├── types/          # shared types
├── util/           # config, http helpers, constants
└── index.ts        # CLI entry point
```

## Cost

Prompt caching is enabled on the static analyst framework. After the first run of the day, each subsequent run should show `cache_read_input_tokens > 0` — cost drops ~90% for the frozen part.

## Extending

- Add a new fetcher: create `src/fetchers/<name>.ts`, export a fn that returns typed data, register in `src/fetchers/index.ts`.
- Add a new AI output field: update the schema in `src/analysis/synthesize.ts` and the type in `src/types/snapshot.ts`.
- Add a new notifier: create `src/notify/<name>.ts` following the email/telegram pattern.

## Notes

- No paid APIs required. CoinGecko, DeFiLlama, Etherscan public endpoints, Binance public futures API, and a free RPC are enough for MVP.
- Some advanced metrics (holder concentration, on-chain burns per 24h, exchange netflow by CEX) require paid Nansen/Arkham/Glassnode. They're stubbed as `null` in the snapshot; add them later.
- Data is best-effort. Any failed fetcher produces `null` and appends to `snapshot.errors[]` — the AI is instructed to acknowledge gaps rather than fabricate.
