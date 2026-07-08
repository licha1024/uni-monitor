// Shared CSS for all generated pages. Keep in one place.
export const SITE_CSS = `
:root {
  --bg: #0d1117;
  --panel: #161b22;
  --panel-2: #1c232c;
  --border: #30363d;
  --text: #e6edf3;
  --text-dim: #8b949e;
  --accent: #58a6ff;
  --green: #3fb950;
  --red: #f85149;
  --amber: #d29922;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", sans-serif;
  line-height: 1.6;
  min-height: 100vh;
}
/* Language switching: hide the inactive language */
html[data-lang="zh"] .lang-en { display: none; }
html[data-lang="en"] .lang-zh { display: none; }
/* Default before JS runs: show Chinese (Chinese is the site's default) */
.lang-en { display: none; }
html[data-lang="en"] .lang-en { display: inline; }
html[data-lang="en"] .lang-zh { display: none; }

.container { max-width: 900px; margin: 0 auto; padding: 32px 20px 80px; }
header { border-bottom: 1px solid var(--border); padding-bottom: 20px; margin-bottom: 28px; }
header .title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
header .title { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
header h1 { font-size: 28px; letter-spacing: -0.5px; }
header .subtitle { color: var(--text-dim); font-size: 14px; }
header .nav { margin-top: 12px; display: flex; gap: 20px; font-size: 14px; }
header .nav a { color: var(--accent); text-decoration: none; }
header .nav a:hover { text-decoration: underline; }
.lang-toggle {
  background: var(--panel);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  min-width: 48px;
  transition: all 0.15s;
}
.lang-toggle:hover { background: var(--panel-2); border-color: var(--accent); color: var(--accent); }
.stance-pill {
  display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.stance-bullish { background: rgba(63, 185, 80, 0.15); color: var(--green); }
.stance-bearish { background: rgba(248, 81, 73, 0.15); color: var(--red); }
.stance-neutral { background: rgba(139, 148, 158, 0.15); color: var(--text-dim); }
.headline { font-size: 20px; margin: 16px 0; line-height: 1.4; }
h2 {
  font-size: 12px; text-transform: uppercase; letter-spacing: 1px;
  color: var(--text-dim); margin: 28px 0 12px; font-weight: 600;
}
.metrics {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 16px;
}
.metric { display: flex; flex-direction: column; gap: 2px; }
.metric-label { color: var(--text-dim); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
.metric-value { font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
.metric-value.pos { color: var(--green); }
.metric-value.neg { color: var(--red); }
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 20px; margin-bottom: 16px; }
.card p { color: var(--text); }
.contrarian { border-left: 3px solid var(--amber); background: rgba(210, 153, 34, 0.06); }
.contrarian .label { color: var(--amber); font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 6px; }
ol, ul { padding-left: 22px; }
ol li, ul li { margin-bottom: 6px; }
a { color: var(--accent); }
.footer { color: var(--text-dim); font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border); }
.error-note { background: rgba(248, 81, 73, 0.06); border-left: 3px solid var(--red); padding: 8px 12px; margin-top: 12px; font-size: 12px; color: var(--text-dim); }
.history-list { display: grid; gap: 8px; }
.history-item { background: var(--panel); border: 1px solid var(--border); border-radius: 6px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; }
.history-item a { text-decoration: none; }
.history-date { font-variant-numeric: tabular-nums; color: var(--text); font-weight: 500; }
.history-headline { color: var(--text-dim); font-size: 13px; margin-top: 2px; }
.badge-info { color: var(--text-dim); font-size: 12px; }
code { background: var(--panel-2); padding: 2px 6px; border-radius: 3px; font-size: 13px; }
`;
