import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import seedSources from '../data/seed/sources.json';
import { addSourceEvent, insertPassages, resetDb, upsertSource } from '../lib/db';
import { ingestPdf } from '../lib/ingest';
import type { Source } from '../lib/types';

type SeedEntry = Omit<Source, 'sha256' | 'added_at' | 'added_by'> & { seed: boolean };

async function main() {
  resetDb();
  const now = new Date().toISOString();
  let files = 0;
  let metadataOnly = 0;

  for (const entry of seedSources as SeedEntry[]) {
    if (!entry.seed) {
      console.log(`skip  ${entry.id} (uploaded live)`);
      continue;
    }
    const { seed: _seed, ...fields } = entry;
    const source: Source = { ...fields, sha256: null, added_at: now, added_by: 'seed' };

    if (source.file_path) {
      const abs = path.join(process.cwd(), source.file_path);
      if (!fs.existsSync(abs)) {
        console.error(`MISSING ${source.file_path} — copy the starter-pack PDFs into data/files/`);
        process.exitCode = 1;
        continue;
      }
      const { sha256, passages } = await ingestPdf(new Uint8Array(fs.readFileSync(abs)), source.id);
      source.sha256 = sha256;
      upsertSource(source);
      insertPassages(passages);
      files++;
      console.log(`ok    ${source.id}: ${passages.length} passages`);
    } else {
      upsertSource(source);
      metadataOnly++;
      console.log(`ok    ${source.id}: metadata only`);
    }
    addSourceEvent({ id: randomUUID(), source_id: source.id, at: now, by: 'seed', type: 'toegevoegd', reason: null });
  }

  console.log(`\n${files} sources with files, ${metadataOnly} metadata-only`);
}

main();
