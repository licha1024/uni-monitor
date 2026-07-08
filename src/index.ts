import { collectSnapshot } from './fetchers/index.js';
import { synthesize } from './analysis/synthesize.js';
import { renderPlain, renderHtml } from './notify/render.js';
import { sendEmail } from './notify/email.js';
import { sendTelegram } from './notify/telegram.js';
import { saveSnapshot } from './notify/store.js';

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    send: args.includes('--send'),
    save: args.includes('--save'),
    fetchOnly: args.includes('--fetch-only'),
  };
}

async function main() {
  const args = parseArgs();
  const t0 = Date.now();

  console.log('[uni-monitor] collecting snapshot...');
  const snapshot = await collectSnapshot();
  const t1 = Date.now();
  console.log(`[uni-monitor] snapshot collected in ${((t1 - t0) / 1000).toFixed(1)}s`);

  if (snapshot.errors.length > 0) {
    console.warn(`[uni-monitor] ${snapshot.errors.length} data fetch errors:`);
    snapshot.errors.forEach((e) => console.warn(`  - ${e}`));
  }

  if (args.fetchOnly) {
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  console.log('[uni-monitor] synthesizing daily analysis with Claude Opus 4.7...');
  const analysis = await synthesize(snapshot);
  const t2 = Date.now();
  console.log(`[uni-monitor] synthesis complete in ${((t2 - t1) / 1000).toFixed(1)}s`);

  const plain = renderPlain(snapshot, analysis);
  const html = renderHtml(snapshot, analysis);

  console.log('\n' + '='.repeat(60));
  console.log(plain);
  console.log('='.repeat(60) + '\n');

  if (args.save) {
    const path = await saveSnapshot(snapshot, analysis);
    console.log(`[uni-monitor] snapshot saved: ${path}`);
  }

  if (args.send && !args.dryRun) {
    const subject = `UNI Brief ${snapshot.dateISO} — ${analysis.stance.toUpperCase()} · ${analysis.headline.en.slice(0, 60)}`;
    await Promise.all([
      sendEmail(subject, html, plain).catch((e) =>
        console.error('[email] failed:', e.message)
      ),
      sendTelegram(plain).catch((e) =>
        console.error('[telegram] failed:', e.message)
      ),
    ]);
  } else if (args.dryRun) {
    console.log('[uni-monitor] --dry-run set, skipping notifications');
  }

  const totalMs = Date.now() - t0;
  console.log(`[uni-monitor] done in ${(totalMs / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error('[uni-monitor] FATAL:', err);
  process.exit(1);
});
