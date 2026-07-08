import type { UniSnapshot, DailyAnalysis } from '../types/snapshot.js';

const stanceEmoji: Record<DailyAnalysis['stance'], string> = {
  bullish: '📈',
  neutral: '➖',
  bearish: '📉',
};

function num(n: number | null | undefined, digits = 2): string {
  if (n == null || !isFinite(n)) return 'n/a';
  return n.toFixed(digits);
}

function usd(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return 'n/a';
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function pctSigned(n: number | null | undefined): string {
  if (n == null) return 'n/a';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

/**
 * Plain-text version for Telegram (Markdown light) and stdout.
 */
export function renderPlain(snap: UniSnapshot, a: DailyAnalysis): string {
  const price = snap.market.priceUsd;
  return `📊 UNI Daily Brief — ${snap.dateISO}

${stanceEmoji[a.stance]} ${a.stance.toUpperCase()} (${a.confidence} confidence)
${a.headline}

━━━ MARKET ━━━
Price: $${num(price, 4)}  (${pctSigned(snap.market.priceChange24hPct)} 24h, ${pctSigned(snap.market.priceChange7dPct)} 7d)
Vol 24h: ${usd(snap.market.volume24hUsd)}
TVL: ${usd(snap.protocol.tvlUsd)} (${pctSigned(snap.protocol.tvlChange7dPct)} 7d)
Protocol rev 7d: ${usd(snap.protocol.revenue7dUsd)}
Funding: ${pctSigned(snap.derivatives.fundingRatePct)}   OI: ${usd(snap.derivatives.openInterestUsd)}

━━━ TODAY'S 3 KEY CHANGES ━━━
${a.keyChanges.map((k, i) => `${i + 1}. ${k}`).join('\n')}

━━━ CONTRARIAN OBSERVATION ━━━
${a.contrarianObservation}

━━━ FULL READ ━━━
${a.fullReasoning}

━━━ WATCH NEXT ━━━
${a.watchNext.map((w, i) => `• ${w}`).join('\n')}

${snap.errors.length > 0 ? `\n⚠️ Data errors: ${snap.errors.length}\n` + snap.errors.map((e) => `  - ${e}`).join('\n') : ''}
`;
}

/**
 * HTML version for email.
 */
export function renderHtml(snap: UniSnapshot, a: DailyAnalysis): string {
  const stanceColor =
    a.stance === 'bullish' ? '#0f9d58' : a.stance === 'bearish' ? '#d93025' : '#5f6368';
  const price = snap.market.priceUsd;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>UNI Daily Brief — ${snap.dateISO}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #202124; max-width: 720px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .stance { display: inline-block; padding: 6px 12px; border-radius: 4px; color: white; font-weight: 600; background: ${stanceColor}; }
  .headline { font-size: 18px; margin: 16px 0; color: #202124; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #5f6368; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin-top: 28px; }
  .metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 14px; }
  .metric-key { color: #5f6368; }
  ol, ul { padding-left: 20px; }
  .contrarian { background: #fef7e0; border-left: 3px solid #f9ab00; padding: 12px 16px; margin: 12px 0; }
  .footer { font-size: 12px; color: #5f6368; margin-top: 32px; padding-top: 12px; border-top: 1px solid #e0e0e0; }
</style>
</head>
<body>
  <h1>UNI Daily Brief — ${snap.dateISO}</h1>
  <span class="stance">${a.stance.toUpperCase()} · ${a.confidence} confidence</span>
  <p class="headline">${a.headline}</p>

  <h2>Market</h2>
  <div class="metrics">
    <div><span class="metric-key">Price:</span> $${num(price, 4)}</div>
    <div><span class="metric-key">24h:</span> ${pctSigned(snap.market.priceChange24hPct)}</div>
    <div><span class="metric-key">7d:</span> ${pctSigned(snap.market.priceChange7dPct)}</div>
    <div><span class="metric-key">Vol 24h:</span> ${usd(snap.market.volume24hUsd)}</div>
    <div><span class="metric-key">TVL:</span> ${usd(snap.protocol.tvlUsd)}</div>
    <div><span class="metric-key">TVL 7d:</span> ${pctSigned(snap.protocol.tvlChange7dPct)}</div>
    <div><span class="metric-key">Revenue 7d:</span> ${usd(snap.protocol.revenue7dUsd)}</div>
    <div><span class="metric-key">Funding:</span> ${pctSigned(snap.derivatives.fundingRatePct)}</div>
    <div><span class="metric-key">OI:</span> ${usd(snap.derivatives.openInterestUsd)}</div>
    <div><span class="metric-key">UNI/ETH:</span> ${snap.crossMarket.uniEthRatio?.toFixed(6) ?? 'n/a'}</div>
  </div>

  <h2>Today's 3 Key Changes</h2>
  <ol>${a.keyChanges.map((k) => `<li>${escapeHtml(k)}</li>`).join('')}</ol>

  <div class="contrarian">
    <strong>Contrarian Observation</strong><br>
    ${escapeHtml(a.contrarianObservation)}
  </div>

  <h2>Full Read</h2>
  <p>${escapeHtml(a.fullReasoning)}</p>

  <h2>Watch Next</h2>
  <ul>${a.watchNext.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>

  ${
    snap.governance.activeProposals.length > 0
      ? `<h2>Active Governance</h2><ul>${snap.governance.activeProposals
          .map((p) => `<li><a href="${p.url}">${escapeHtml(p.title)}</a> [${p.status}]</li>`)
          .join('')}</ul>`
      : ''
  }

  <div class="footer">
    Powered by Claude Opus 4.7 · Data: CoinGecko, DeFiLlama, Etherscan, Binance, Snapshot.
    ${snap.errors.length > 0 ? `<br>Data errors this run: ${snap.errors.length}` : ''}
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
