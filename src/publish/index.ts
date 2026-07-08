import { readFile, readdir, writeFile, mkdir, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { collectSnapshot } from '../fetchers/index.js';
import { synthesize } from '../analysis/synthesize.js';
import { saveSnapshot } from '../notify/store.js';
import { renderReportPage, renderHistoryPage, HistoryEntry } from './site.js';
import type { UniSnapshot, DailyAnalysis } from '../types/snapshot.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const SNAPSHOTS_DIR = join(ROOT, 'data', 'snapshots');
const DOCS_DIR = join(ROOT, 'docs');
const HISTORY_DIR = join(DOCS_DIR, 'history');

interface StoredPayload {
  snapshot: UniSnapshot;
  analysis: DailyAnalysis;
  savedAt: string;
}

function args() {
  const a = process.argv.slice(2);
  return {
    // if set, use last saved snapshot instead of fetching+synthesizing
    reuseLatest: a.includes('--reuse-latest'),
  };
}

async function loadStored(dateISO: string): Promise<StoredPayload | null> {
  const path = join(SNAPSHOTS_DIR, `${dateISO}.json`);
  if (!existsSync(path)) return null;
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw) as StoredPayload;
}

async function listStoredDates(): Promise<string[]> {
  if (!existsSync(SNAPSHOTS_DIR)) return [];
  const files = await readdir(SNAPSHOTS_DIR);
  return files
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => f.replace(/\.json$/, ''))
    .sort((a, b) => (a < b ? 1 : -1)); // newest first
}

async function main() {
  await mkdir(DOCS_DIR, { recursive: true });
  await mkdir(HISTORY_DIR, { recursive: true });

  const { reuseLatest } = args();

  let today: StoredPayload;

  if (reuseLatest) {
    const dates = await listStoredDates();
    if (dates.length === 0) {
      throw new Error('--reuse-latest set but no snapshots exist');
    }
    console.log(`[publish] reusing latest snapshot: ${dates[0]}`);
    today = (await loadStored(dates[0]))!;
  } else {
    console.log('[publish] collecting snapshot + running Claude synthesis...');
    const snapshot = await collectSnapshot();
    const analysis = await synthesize(snapshot);
    const path = await saveSnapshot(snapshot, analysis);
    console.log(`[publish] saved snapshot: ${path}`);
    today = { snapshot, analysis, savedAt: new Date().toISOString() };
  }

  // 1. Write latest report as index.html
  const indexHtml = renderReportPage(today.snapshot, today.analysis, false);
  await writeFile(join(DOCS_DIR, 'index.html'), indexHtml, 'utf-8');
  console.log('[publish] wrote docs/index.html');

  // 2. Write per-date report + build history list
  const dates = await listStoredDates();
  const history: HistoryEntry[] = [];

  for (const date of dates) {
    const stored = await loadStored(date);
    if (!stored) continue;

    const isToday = date === today.snapshot.dateISO;
    const filename = `${date}.html`;
    const html = renderReportPage(stored.snapshot, stored.analysis, true);
    await writeFile(join(HISTORY_DIR, filename), html, 'utf-8');

    // Also copy the raw JSON to docs so it's fetchable from the site
    await mkdir(join(DOCS_DIR, 'data'), { recursive: true });
    await copyFile(
      join(SNAPSHOTS_DIR, `${date}.json`),
      join(DOCS_DIR, 'data', `${date}.json`)
    );

    history.push({
      dateISO: date,
      filename,
      headline: stored.analysis.headline,
      stance: stored.analysis.stance,
      price: stored.snapshot.market.priceUsd,
    });

    if (isToday) {
      // Also expose latest as a stable URL
      await writeFile(
        join(DOCS_DIR, 'data', 'latest.json'),
        JSON.stringify(stored, null, 2),
        'utf-8'
      );
    }
  }

  const historyHtml = renderHistoryPage(history);
  await writeFile(join(DOCS_DIR, 'history.html'), historyHtml, 'utf-8');
  console.log(`[publish] wrote docs/history.html with ${history.length} reports`);

  // 3. Small robots.txt / no-cache hint via meta (Pages will handle)
  await writeFile(join(DOCS_DIR, '.nojekyll'), '', 'utf-8');

  console.log(`[publish] done. Latest: ${today.snapshot.dateISO}`);
}

main().catch((err) => {
  console.error('[publish] FATAL:', err);
  process.exit(1);
});
