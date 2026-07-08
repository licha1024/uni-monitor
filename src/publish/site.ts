import type { UniSnapshot, DailyAnalysis } from '../types/snapshot.js';
import { SITE_CSS } from './theme.js';

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

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pctClass(n: number | null | undefined): string {
  if (n == null) return '';
  return n > 0 ? 'pos' : n < 0 ? 'neg' : '';
}

export interface HistoryEntry {
  dateISO: string;
  filename: string;
  headline: string;
  stance: DailyAnalysis['stance'];
  price: number | null;
}

const HEADER = (subtitle: string, showBackLink: boolean) => `
<header>
  <div class="title">
    <h1>UNI Monitor</h1>
    <span class="subtitle">${subtitle}</span>
  </div>
  <nav class="nav">
    <a href="${showBackLink ? '../index.html' : 'index.html'}">Latest</a>
    <a href="${showBackLink ? '../history.html' : 'history.html'}">History</a>
    <a href="https://github.com/licha1024/uni-monitor" target="_blank">GitHub</a>
  </nav>
</header>
`;

export function renderReportPage(
  snap: UniSnapshot,
  a: DailyAnalysis,
  isHistorical = false
): string {
  const stanceClass = `stance-${a.stance}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UNI Brief ${snap.dateISO} — ${a.stance.toUpperCase()}</title>
<style>${SITE_CSS}</style>
</head>
<body>
<div class="container">
  ${HEADER(`Report for ${snap.dateISO}`, isHistorical)}

  <span class="stance-pill ${stanceClass}">${a.stance} · ${a.confidence} confidence</span>
  <p class="headline">${esc(a.headline)}</p>

  <h2>Market</h2>
  <div class="metrics">
    <div class="metric"><span class="metric-label">Price</span><span class="metric-value">$${num(snap.market.priceUsd, 4)}</span></div>
    <div class="metric"><span class="metric-label">24h</span><span class="metric-value ${pctClass(snap.market.priceChange24hPct)}">${pctSigned(snap.market.priceChange24hPct)}</span></div>
    <div class="metric"><span class="metric-label">7d</span><span class="metric-value ${pctClass(snap.market.priceChange7dPct)}">${pctSigned(snap.market.priceChange7dPct)}</span></div>
    <div class="metric"><span class="metric-label">24h Volume</span><span class="metric-value">${usd(snap.market.volume24hUsd)}</span></div>
    <div class="metric"><span class="metric-label">Market Cap</span><span class="metric-value">${usd(snap.market.marketCapUsd)}</span></div>
    <div class="metric"><span class="metric-label">FDV</span><span class="metric-value">${usd(snap.market.fdvUsd)}</span></div>
    <div class="metric"><span class="metric-label">ATH Distance</span><span class="metric-value neg">${pctSigned(snap.market.athChangePct)}</span></div>
  </div>

  <h2>Protocol</h2>
  <div class="metrics">
    <div class="metric"><span class="metric-label">TVL</span><span class="metric-value">${usd(snap.protocol.tvlUsd)}</span></div>
    <div class="metric"><span class="metric-label">TVL 7d</span><span class="metric-value ${pctClass(snap.protocol.tvlChange7dPct)}">${pctSigned(snap.protocol.tvlChange7dPct)}</span></div>
    <div class="metric"><span class="metric-label">Fees 24h</span><span class="metric-value">${usd(snap.protocol.fees24hUsd)}</span></div>
    <div class="metric"><span class="metric-label">Fees 7d</span><span class="metric-value">${usd(snap.protocol.fees7dUsd)}</span></div>
    <div class="metric"><span class="metric-label">Revenue 7d</span><span class="metric-value">${usd(snap.protocol.revenue7dUsd)}</span></div>
    <div class="metric"><span class="metric-label">Unichain TVL</span><span class="metric-value">${usd(snap.protocol.unichainTvlUsd)}</span></div>
  </div>

  <h2>Derivatives</h2>
  <div class="metrics">
    <div class="metric"><span class="metric-label">Open Interest</span><span class="metric-value">${usd(snap.derivatives.openInterestUsd)}</span></div>
    <div class="metric"><span class="metric-label">Funding Rate</span><span class="metric-value ${pctClass(snap.derivatives.fundingRatePct)}">${pctSigned(snap.derivatives.fundingRatePct)}</span></div>
    <div class="metric"><span class="metric-label">Long/Short Ratio</span><span class="metric-value">${snap.derivatives.longShortRatio?.toFixed(3) ?? 'n/a'}</span></div>
  </div>

  <h2>Today's 3 Key Changes</h2>
  <div class="card"><ol>${a.keyChanges.map((k) => `<li>${esc(k)}</li>`).join('')}</ol></div>

  <h2>Contrarian Observation</h2>
  <div class="card contrarian">
    <div class="label">Reality Check</div>
    <p>${esc(a.contrarianObservation)}</p>
  </div>

  <h2>Full Read</h2>
  <div class="card"><p>${esc(a.fullReasoning)}</p></div>

  <h2>Watch Next</h2>
  <div class="card"><ul>${a.watchNext.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>

  ${
    snap.governance.activeProposals.length > 0
      ? `<h2>Active Governance</h2>
  <div class="card">
    <ul>${snap.governance.activeProposals
      .map((p) => `<li><a href="${esc(p.url)}" target="_blank">${esc(p.title)}</a> <span class="badge-info">[${p.status}]</span></li>`)
      .join('')}</ul>
  </div>`
      : ''
  }

  <div class="footer">
    Data: CoinGecko · DeFiLlama · Ethereum RPC · Binance · Snapshot.
    AI synthesis: <code>claude-opus-4-7</code> with adaptive thinking + prompt caching.
    <br>Timestamp: ${snap.timestamp}
    ${
      snap.errors.length > 0
        ? `<div class="error-note">${snap.errors.length} data source(s) failed this run: ${snap.errors.map((e) => esc(e)).join(' · ')}</div>`
        : ''
    }
  </div>
</div>
</body>
</html>`;
}

export function renderHistoryPage(entries: HistoryEntry[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UNI Monitor — History</title>
<style>${SITE_CSS}</style>
</head>
<body>
<div class="container">
  ${HEADER('Daily archive', false)}

  <h2>All reports (${entries.length})</h2>
  <div class="history-list">
    ${
      entries.length === 0
        ? '<p style="color:var(--text-dim)">No reports yet. First run pending.</p>'
        : entries
            .map(
              (e) => `
    <a href="history/${esc(e.filename)}" style="text-decoration:none">
      <div class="history-item">
        <div>
          <div class="history-date">${e.dateISO} <span class="stance-pill stance-${e.stance}" style="margin-left:8px;font-size:10px;padding:2px 8px">${e.stance}</span></div>
          <div class="history-headline">${esc(e.headline)}</div>
        </div>
        <div class="badge-info">$${num(e.price, 4)}</div>
      </div>
    </a>`
            )
            .join('')
    }
  </div>

  <div class="footer">
    Reports are generated daily by GitHub Actions. Data snapshots (raw JSON) are archived in
    <a href="https://github.com/licha1024/uni-monitor/tree/main/data/snapshots" target="_blank">/data/snapshots</a>.
  </div>
</div>
</body>
</html>`;
}
