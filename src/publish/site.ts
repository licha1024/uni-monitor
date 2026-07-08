import type { UniSnapshot, DailyAnalysis, Bilingual } from '../types/snapshot.js';
import { SITE_CSS } from './theme.js';

// ---------- formatters ----------
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

// Render a bilingual field as two spans; CSS shows only the active language
function bi(b: Bilingual | undefined | null): string {
  if (!b) return '';
  return `<span class="lang-en">${esc(b.en || b.zh || '')}</span><span class="lang-zh">${esc(b.zh || b.en || '')}</span>`;
}

// UI label bilingual pairs
const T = {
  latest: { en: 'Latest', zh: '最新' },
  history: { en: 'History', zh: '历史' },
  github: { en: 'GitHub', zh: 'GitHub' },
  reportFor: { en: 'Report for', zh: '报告日期' },
  confidence: { en: 'confidence', zh: '置信度' },
  market: { en: 'Market', zh: '市场' },
  protocol: { en: 'Protocol', zh: '协议' },
  derivatives: { en: 'Derivatives', zh: '衍生品' },
  keyChanges: { en: "Today's 3 Key Changes", zh: '今日三大变化' },
  contrarian: { en: 'Contrarian Observation', zh: '反向观察' },
  contrarianLabel: { en: 'Reality Check', zh: '警醒视角' },
  fullRead: { en: 'Full Read', zh: '完整解读' },
  watchNext: { en: 'Watch Next', zh: '接下来关注' },
  governance: { en: 'Active Governance', zh: '进行中的治理' },
  price: { en: 'Price', zh: '价格' },
  '24h': { en: '24h', zh: '24小时' },
  '7d': { en: '7d', zh: '7天' },
  volume24h: { en: '24h Volume', zh: '24小时成交量' },
  marketCap: { en: 'Market Cap', zh: '流通市值' },
  fdv: { en: 'FDV', zh: '完全稀释估值' },
  athDist: { en: 'ATH Distance', zh: '距历史高点' },
  tvl: { en: 'TVL', zh: '锁仓总量' },
  tvl7d: { en: 'TVL 7d', zh: 'TVL 7日变化' },
  fees24h: { en: 'Fees 24h', zh: '24小时费用' },
  fees7d: { en: 'Fees 7d', zh: '7日费用' },
  revenue7d: { en: 'Revenue 7d', zh: '7日协议收入' },
  unichainTvl: { en: 'Unichain TVL', zh: 'Unichain TVL' },
  openInterest: { en: 'Open Interest', zh: '未平仓合约' },
  fundingRate: { en: 'Funding Rate', zh: '资金费率' },
  longShort: { en: 'Long/Short Ratio', zh: '多空比' },
  footer1: {
    en: 'Data: CoinGecko · DeFiLlama · Ethereum RPC · Bybit · Snapshot.',
    zh: '数据源: CoinGecko · DeFiLlama · 以太坊 RPC · Bybit · Snapshot.',
  },
  footer2: {
    en: 'AI synthesis: <code>claude-opus-4-7</code> with adaptive thinking + prompt caching.',
    zh: 'AI 合成: <code>claude-opus-4-7</code> 自适应思考 + prompt caching.',
  },
  timestamp: { en: 'Timestamp', zh: '时间戳' },
  langBtnZh: { en: 'EN', zh: '中' }, // shown on the button (opposite of current)
  historyTitle: { en: 'Daily archive', zh: '每日归档' },
  allReports: { en: 'All reports', zh: '所有报告' },
  noReports: { en: 'No reports yet. First run pending.', zh: '暂无报告，等待首次运行。' },
  archiveFooter: {
    en: 'Reports are generated daily by GitHub Actions. Raw JSON in /data/snapshots.',
    zh: '报告由 GitHub Actions 每日自动生成。原始 JSON 在 /data/snapshots。',
  },
  stanceBullish: { en: 'BULLISH', zh: '看多' },
  stanceBearish: { en: 'BEARISH', zh: '看空' },
  stanceNeutral: { en: 'NEUTRAL', zh: '中性' },
  confLow: { en: 'low', zh: '低' },
  confMedium: { en: 'medium', zh: '中' },
  confHigh: { en: 'high', zh: '高' },
} as const;

const t = (key: keyof typeof T): string => bi(T[key]);

// Head section shared by all pages. The inline script runs before render:
// it reads localStorage (default 'zh') and sets <html data-lang> so CSS applies
// the correct language before first paint (no flash).
function head(title: string): string {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${SITE_CSS}</style>
<script>
  (function() {
    try {
      var lang = localStorage.getItem('uniMonitorLang') || 'zh';
      document.documentElement.setAttribute('data-lang', lang);
      document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
    } catch (e) {
      document.documentElement.setAttribute('data-lang', 'zh');
    }
  })();
</script>
</head>`;
}

function langToggleScript(): string {
  return `
<script>
  // ---------- language toggle ----------
  document.getElementById('lang-toggle').addEventListener('click', function() {
    var cur = document.documentElement.getAttribute('data-lang') === 'zh' ? 'zh' : 'en';
    var next = cur === 'zh' ? 'en' : 'zh';
    document.documentElement.setAttribute('data-lang', next);
    document.documentElement.setAttribute('lang', next === 'zh' ? 'zh-CN' : 'en');
    try { localStorage.setItem('uniMonitorLang', next); } catch(e){}
  });

  // ---------- live price ticker ----------
  (function() {
    var priceEl = document.getElementById('live-price');
    var changeEl = document.getElementById('live-change');
    var updatedEl = document.getElementById('live-updated');
    var tickerEl = document.getElementById('live-ticker');
    if (!priceEl) return;

    var lastPrice = null;

    function fmtPrice(p) { return '$' + p.toFixed(4); }
    function fmtPct(p)   { return (p >= 0 ? '+' : '') + p.toFixed(2) + '%'; }
    function fmtTime(d)  {
      var pad = function(n){return n<10?'0'+n:n;};
      return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }

    async function fromOkx() {
      var r = await fetch('https://www.okx.com/api/v5/market/ticker?instId=UNI-USDT', { cache: 'no-store' });
      var j = await r.json();
      var d = j && j.data && j.data[0];
      if (!d) throw new Error('okx: empty');
      var last = parseFloat(d.last);
      var open = parseFloat(d.open24h);
      return { price: last, change24h: open > 0 ? (last - open) / open * 100 : null };
    }

    async function fromCoinGecko() {
      var r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=uniswap&vs_currencies=usd&include_24hr_change=true', { cache: 'no-store' });
      var j = await r.json();
      var u = j && j.uniswap;
      if (!u) throw new Error('cg: empty');
      return { price: u.usd, change24h: u.usd_24h_change != null ? u.usd_24h_change : null };
    }

    async function refresh() {
      var data;
      try { data = await fromOkx(); }
      catch (e1) {
        try { data = await fromCoinGecko(); }
        catch (e2) { tickerEl.setAttribute('data-error', 'true'); return; }
      }
      tickerEl.removeAttribute('data-error');
      tickerEl.removeAttribute('data-loading');

      priceEl.textContent = fmtPrice(data.price);
      if (data.change24h != null) {
        changeEl.textContent = fmtPct(data.change24h) + ' 24h';
        changeEl.className = 'live-change ' + (data.change24h >= 0 ? 'pos' : 'neg');
      }
      updatedEl.textContent = fmtTime(new Date());

      // flash green/red when price moves
      if (lastPrice != null && data.price !== lastPrice) {
        var dir = data.price > lastPrice ? 'flash-up' : 'flash-down';
        priceEl.classList.remove('flash-up', 'flash-down');
        // force reflow so animation restarts
        void priceEl.offsetWidth;
        priceEl.classList.add(dir);
      }
      lastPrice = data.price;
    }

    refresh();
    setInterval(refresh, 60000);
    // Also refresh when the tab regains focus after being hidden a while
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) refresh();
    });
  })();
</script>`;
}

function header(subtitle: Bilingual, showBackLink: boolean): string {
  const prefix = showBackLink ? '../' : '';
  return `
<div id="live-ticker" class="live-ticker" data-loading="true">
  <span class="live-dot" aria-hidden="true"></span>
  <span class="live-label"><span class="lang-en">LIVE</span><span class="lang-zh">实时</span></span>
  <span class="live-price" id="live-price">—</span>
  <span class="live-change" id="live-change">—</span>
  <span class="live-updated" id="live-updated"></span>
</div>
<header>
  <div class="title-row">
    <div class="title">
      <h1>UNI Monitor</h1>
      <span class="subtitle">${bi(subtitle)}</span>
    </div>
    <button id="lang-toggle" class="lang-toggle" title="Switch language / 切换语言">
      <span class="lang-en">中</span><span class="lang-zh">EN</span>
    </button>
  </div>
  <nav class="nav">
    <a href="${prefix}index.html">${t('latest')}</a>
    <a href="${prefix}history.html">${t('history')}</a>
    <a href="https://github.com/licha1024/uni-monitor" target="_blank">${t('github')}</a>
  </nav>
</header>
`;
}

const stanceLabel = (s: DailyAnalysis['stance']): string =>
  s === 'bullish' ? t('stanceBullish') : s === 'bearish' ? t('stanceBearish') : t('stanceNeutral');

const confLabel = (c: DailyAnalysis['confidence']): string =>
  c === 'low' ? t('confLow') : c === 'high' ? t('confHigh') : t('confMedium');

export interface HistoryEntry {
  dateISO: string;
  filename: string;
  headline: Bilingual;
  stance: DailyAnalysis['stance'];
  price: number | null;
}

export function renderReportPage(
  snap: UniSnapshot,
  a: DailyAnalysis,
  isHistorical = false
): string {
  const stanceCls = `stance-${a.stance}`;
  const title = `UNI Brief ${snap.dateISO} — ${a.stance.toUpperCase()}`;
  const subtitle: Bilingual = {
    en: `Report for ${snap.dateISO}`,
    zh: `${snap.dateISO} 报告`,
  };

  return `${head(title)}
<body>
<div class="container">
  ${header(subtitle, isHistorical)}

  <span class="stance-pill ${stanceCls}">${stanceLabel(a.stance)} · ${confLabel(a.confidence)} ${t('confidence')}</span>
  <p class="headline">${bi(a.headline)}</p>

  <h2>${t('market')}</h2>
  <div class="metrics">
    <div class="metric"><span class="metric-label">${t('price')}</span><span class="metric-value">$${num(snap.market.priceUsd, 4)}</span></div>
    <div class="metric"><span class="metric-label">${t('24h')}</span><span class="metric-value ${pctClass(snap.market.priceChange24hPct)}">${pctSigned(snap.market.priceChange24hPct)}</span></div>
    <div class="metric"><span class="metric-label">${t('7d')}</span><span class="metric-value ${pctClass(snap.market.priceChange7dPct)}">${pctSigned(snap.market.priceChange7dPct)}</span></div>
    <div class="metric"><span class="metric-label">${t('volume24h')}</span><span class="metric-value">${usd(snap.market.volume24hUsd)}</span></div>
    <div class="metric"><span class="metric-label">${t('marketCap')}</span><span class="metric-value">${usd(snap.market.marketCapUsd)}</span></div>
    <div class="metric"><span class="metric-label">${t('fdv')}</span><span class="metric-value">${usd(snap.market.fdvUsd)}</span></div>
    <div class="metric"><span class="metric-label">${t('athDist')}</span><span class="metric-value neg">${pctSigned(snap.market.athChangePct)}</span></div>
  </div>

  <h2>${t('protocol')}</h2>
  <div class="metrics">
    <div class="metric"><span class="metric-label">${t('tvl')}</span><span class="metric-value">${usd(snap.protocol.tvlUsd)}</span></div>
    <div class="metric"><span class="metric-label">${t('tvl7d')}</span><span class="metric-value ${pctClass(snap.protocol.tvlChange7dPct)}">${pctSigned(snap.protocol.tvlChange7dPct)}</span></div>
    <div class="metric"><span class="metric-label">${t('fees24h')}</span><span class="metric-value">${usd(snap.protocol.fees24hUsd)}</span></div>
    <div class="metric"><span class="metric-label">${t('fees7d')}</span><span class="metric-value">${usd(snap.protocol.fees7dUsd)}</span></div>
    <div class="metric"><span class="metric-label">${t('revenue7d')}</span><span class="metric-value">${usd(snap.protocol.revenue7dUsd)}</span></div>
    <div class="metric"><span class="metric-label">${t('unichainTvl')}</span><span class="metric-value">${usd(snap.protocol.unichainTvlUsd)}</span></div>
  </div>

  <h2>${t('derivatives')}</h2>
  <div class="metrics">
    <div class="metric"><span class="metric-label">${t('openInterest')}</span><span class="metric-value">${usd(snap.derivatives.openInterestUsd)}</span></div>
    <div class="metric"><span class="metric-label">${t('fundingRate')}</span><span class="metric-value ${pctClass(snap.derivatives.fundingRatePct)}">${pctSigned(snap.derivatives.fundingRatePct)}</span></div>
    <div class="metric"><span class="metric-label">${t('longShort')}</span><span class="metric-value">${snap.derivatives.longShortRatio?.toFixed(3) ?? 'n/a'}</span></div>
  </div>

  <h2>${t('keyChanges')}</h2>
  <div class="card"><ol>${a.keyChanges.map((k) => `<li>${bi(k)}</li>`).join('')}</ol></div>

  <h2>${t('contrarian')}</h2>
  <div class="card contrarian">
    <div class="label">${t('contrarianLabel')}</div>
    <p>${bi(a.contrarianObservation)}</p>
  </div>

  <h2>${t('fullRead')}</h2>
  <div class="card"><p>${bi(a.fullReasoning)}</p></div>

  <h2>${t('watchNext')}</h2>
  <div class="card"><ul>${a.watchNext.map((w) => `<li>${bi(w)}</li>`).join('')}</ul></div>

  ${
    snap.governance.activeProposals.length > 0
      ? `<h2>${t('governance')}</h2>
  <div class="card">
    <ul>${snap.governance.activeProposals
      .map((p) => `<li><a href="${esc(p.url)}" target="_blank">${esc(p.title)}</a> <span class="badge-info">[${esc(p.status)}]</span></li>`)
      .join('')}</ul>
  </div>`
      : ''
  }

  <div class="footer">
    ${t('footer1')}<br>
    ${t('footer2')}<br>
    ${t('timestamp')}: ${snap.timestamp}
    ${
      snap.errors.length > 0
        ? `<div class="error-note">${snap.errors.length} fetcher warning(s): ${esc(snap.errors.join(' · '))}</div>`
        : ''
    }
  </div>
</div>
${langToggleScript()}
</body>
</html>`;
}

export function renderHistoryPage(entries: HistoryEntry[]): string {
  const rows =
    entries.length === 0
      ? `<p style="color:var(--text-dim)">${t('noReports')}</p>`
      : entries
          .map(
            (e) => `
    <a href="history/${esc(e.filename)}" style="text-decoration:none">
      <div class="history-item">
        <div>
          <div class="history-date">${e.dateISO} <span class="stance-pill stance-${e.stance}" style="margin-left:8px;font-size:10px;padding:2px 8px">${stanceLabel(e.stance)}</span></div>
          <div class="history-headline">${bi(e.headline)}</div>
        </div>
        <div class="badge-info">$${num(e.price, 4)}</div>
      </div>
    </a>`
          )
          .join('');

  return `${head('UNI Monitor — History')}
<body>
<div class="container">
  ${header(T.historyTitle, false)}

  <h2>${t('allReports')} (${entries.length})</h2>
  <div class="history-list">
    ${rows}
  </div>

  <div class="footer">${t('archiveFooter')}</div>
</div>
${langToggleScript()}
</body>
</html>`;
}
