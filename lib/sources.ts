import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { addSourceEvent, countPassagesBySource, findSourceBySha, getSource, insertPassages, listSourceEvents, listSources, upsertSource } from './db';
import { ingestPdf, sha256 } from './ingest';
import { invalidateIndex } from './pipeline';
import { RequestError } from './snapshot';
import type { Level, Nature, Source, SourceListItem, SourceUploadFields } from './types';

const LEVELS: Level[] = ['federaal', 'vlaams', 'provinciaal', 'gemeentelijk'];
const NATURES: Nature[] = ['wetgeving', 'richtlijn'];
const STATUSES: Source['status'][] = ['van_kracht', 'historisch', 'onbekend'];

export function listSourceItems(): SourceListItem[] {
  const counts = countPassagesBySource();
  const events = listSourceEvents();
  return listSources()
    .map((s) => ({ ...s, passage_count: counts[s.id] ?? 0, events: events.filter((e) => e.source_id === s.id) }))
    .sort((a, b) => a.short_title.localeCompare(b.short_title, 'nl'));
}

const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'bron';

/** Reads the multipart fields. Empty strings become null; required fields and enums are checked. */
export function parseUploadFields(form: FormData): SourceUploadFields {
  const str = (k: string) => {
    const v = form.get(k);
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  };
  const required = (k: string, label: string) => {
    const v = str(k);
    if (!v) throw new RequestError(`Veld ontbreekt: ${label}`, 400);
    return v;
  };
  const date = (k: string) => {
    const v = str(k);
    if (v && !/^\d{4}(-\d{2}(-\d{2})?)?$/.test(v)) throw new RequestError(`Ongeldige datum voor ${k}: gebruik JJJJ-MM-DD`, 400);
    return v;
  };
  const level = required('level', 'niveau') as Level;
  const nature = required('nature', 'aard') as Nature;
  const status = required('status', 'status') as Source['status'];
  if (!LEVELS.includes(level)) throw new RequestError('Ongeldig niveau', 400);
  if (!NATURES.includes(nature)) throw new RequestError('Ongeldige aard', 400);
  if (!STATUSES.includes(status)) throw new RequestError('Ongeldige status', 400);

  return {
    title: required('title', 'titel'),
    short_title: required('short_title', 'korte titel'),
    level,
    issuer: required('issuer', 'uitgever'),
    nature,
    territory: required('territory', 'grondgebied'),
    status,
    adopted_on: date('adopted_on'),
    // Guidance has no validity dates; legislation without them is kept and checked as "onzeker".
    effective_from: nature === 'wetgeving' ? date('effective_from') : null,
    effective_until: nature === 'wetgeving' ? date('effective_until') : null,
    published_on: date('published_on'),
    origin_url: str('origin_url'),
    notes: str('notes'),
    added_by: required('added_by', 'toegevoegd door'),
    supersedes_id: str('supersedes_id'),
  };
}

export async function addSource(fields: SourceUploadFields, fileName: string, data: Uint8Array): Promise<{ source: Source; passages: number }> {
  if (!fileName.toLowerCase().endsWith('.pdf')) throw new RequestError('Alleen PDF-bestanden', 400);
  const sha = sha256(data);
  const dup = findSourceBySha(sha);
  if (dup) throw new RequestError(`Deze versie bestaat al: ${dup.short_title}`, 409);

  const old = fields.supersedes_id ? getSource(fields.supersedes_id) : null;
  if (fields.supersedes_id && !old) throw new RequestError('De bron die vervangen wordt, bestaat niet', 400);

  const { passages } = await ingestPdf(data, 'pending');
  if (passages.length === 0) throw new RequestError('Geen tekst gevonden in de PDF (gescand document?)', 400);

  let id = slug(fields.short_title);
  if (getSource(id)) id = `${id}-${sha.slice(0, 6)}`;

  const rel = path.join('data', 'files', 'uploads', `${sha.slice(0, 8)}-${path.basename(fileName).replace(/[^\w.-]+/g, '_')}`);
  fs.mkdirSync(path.dirname(path.join(process.cwd(), rel)), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), rel), data);

  const now = new Date().toISOString();
  const { supersedes_id: _s, ...rest } = fields;
  const source: Source = { ...rest, id, active: true, superseded_by: null, file_path: rel, sha256: sha, added_at: now };
  upsertSource(source);
  insertPassages(passages.map((p) => ({ ...p, source_id: id })));
  addSourceEvent({ id: randomUUID(), source_id: id, at: now, by: fields.added_by, type: 'toegevoegd', reason: null });

  if (old) {
    upsertSource({ ...old, superseded_by: id });
    addSourceEvent({ id: randomUUID(), source_id: old.id, at: now, by: fields.added_by, type: 'vervangen', reason: `Vervangen door ${source.short_title}` });
  }
  invalidateIndex();
  return { source, passages: passages.length };
}

export function setActive(id: string, active: boolean, reason: string, by: string): Source {
  const source = getSource(id);
  if (!source) throw new RequestError('Bron niet gevonden', 404);
  if (!reason?.trim()) throw new RequestError('Geef een reden op', 400);
  if (!by?.trim()) throw new RequestError('Naam van de medewerker ontbreekt', 400);
  const next = { ...source, active };
  upsertSource(next);
  addSourceEvent({
    id: randomUUID(), source_id: id, at: new Date().toISOString(), by: by.trim(),
    type: active ? 'geactiveerd' : 'gedeactiveerd', reason: reason.trim(),
  });
  invalidateIndex();
  return next;
}
