import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { UniSnapshot, DailyAnalysis } from '../types/snapshot.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS_DIR = join(__dirname, '..', '..', 'data', 'snapshots');

export async function saveSnapshot(
  snap: UniSnapshot,
  analysis: DailyAnalysis
): Promise<string> {
  await mkdir(SNAPSHOTS_DIR, { recursive: true });
  const path = join(SNAPSHOTS_DIR, `${snap.dateISO}.json`);
  const payload = {
    snapshot: snap,
    analysis,
    savedAt: new Date().toISOString(),
  };
  await writeFile(path, JSON.stringify(payload, null, 2), 'utf-8');
  return path;
}
