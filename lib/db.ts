import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { Answer, Note, Passage, Source, SourceEvent } from './types';

// Each row stores its full object as JSON, so adding a field to lib/types.ts never needs a migration.
const DB_PATH = process.env.BRONWIJZER_DB ?? path.join(process.cwd(), 'data', 'bronwijzer.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.exec(`
      create table if not exists sources (id text primary key, json text not null);
      create table if not exists passages (id text primary key, source_id text not null, json text not null);
      create index if not exists passages_source on passages (source_id);
      create table if not exists source_events (id text primary key, source_id text not null, at text not null, json text not null);
      create table if not exists answers (id text primary key, created_at text not null, status text not null, json text not null);
      create table if not exists notes (id text primary key, json text not null);
    `);
  }
  return db;
}

export function resetDb(): void {
  if (db) {
    db.close();
    db = null;
  }
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(DB_PATH + suffix, { force: true });
}

const parse = <T>(row: { json: string } | undefined): T | null => (row ? (JSON.parse(row.json) as T) : null);

// --- sources ---------------------------------------------------------------

export function upsertSource(source: Source): void {
  getDb().prepare('insert or replace into sources (id, json) values (?, ?)').run(source.id, JSON.stringify(source));
}

export function getSource(id: string): Source | null {
  return parse<Source>(getDb().prepare('select json from sources where id = ?').get(id) as { json: string } | undefined);
}

export function listSources(): Source[] {
  const rows = getDb().prepare('select json from sources').all() as { json: string }[];
  return rows.map((r) => JSON.parse(r.json) as Source);
}

export function findSourceBySha(sha256: string): Source | null {
  return listSources().find((s) => s.sha256 === sha256) ?? null;
}

// --- passages --------------------------------------------------------------

export function insertPassages(passages: Passage[]): void {
  const stmt = getDb().prepare('insert or replace into passages (id, source_id, json) values (?, ?, ?)');
  getDb().transaction((items: Passage[]) => {
    for (const p of items) stmt.run(p.id, p.source_id, JSON.stringify(p));
  })(passages);
}

export function getPassagesBySource(sourceId: string): Passage[] {
  const rows = getDb().prepare('select json from passages where source_id = ?').all(sourceId) as { json: string }[];
  return rows.map((r) => JSON.parse(r.json) as Passage);
}

export function listPassages(): Passage[] {
  const rows = getDb().prepare('select json from passages').all() as { json: string }[];
  return rows.map((r) => JSON.parse(r.json) as Passage);
}

export function getPassage(id: string): Passage | null {
  return parse<Passage>(getDb().prepare('select json from passages where id = ?').get(id) as { json: string } | undefined);
}

export function countPassagesBySource(): Record<string, number> {
  const rows = getDb().prepare('select source_id, count(*) as n from passages group by source_id').all() as {
    source_id: string;
    n: number;
  }[];
  return Object.fromEntries(rows.map((r) => [r.source_id, r.n]));
}

// --- source events (append-only) -------------------------------------------

export function addSourceEvent(event: SourceEvent): void {
  getDb()
    .prepare('insert into source_events (id, source_id, at, json) values (?, ?, ?, ?)')
    .run(event.id, event.source_id, event.at, JSON.stringify(event));
}

export function listSourceEvents(sourceId?: string): SourceEvent[] {
  const rows = (
    sourceId
      ? getDb().prepare('select json from source_events where source_id = ? order by at').all(sourceId)
      : getDb().prepare('select json from source_events order by at').all()
  ) as { json: string }[];
  return rows.map((r) => JSON.parse(r.json) as SourceEvent);
}

// --- answers ---------------------------------------------------------------

export function saveAnswer(answer: Answer): void {
  getDb()
    .prepare('insert or replace into answers (id, created_at, status, json) values (?, ?, ?, ?)')
    .run(answer.id, answer.created_at, answer.status, JSON.stringify(answer));
}

export function getAnswer(id: string): Answer | null {
  return parse<Answer>(getDb().prepare('select json from answers where id = ?').get(id) as { json: string } | undefined);
}

export function listAnswers(): Answer[] {
  const rows = getDb().prepare('select json from answers order by created_at desc').all() as { json: string }[];
  return rows.map((r) => JSON.parse(r.json) as Answer);
}

// --- notes (officer knowledge, never evidence) -----------------------------

export function saveNote(note: Note): void {
  getDb().prepare('insert or replace into notes (id, json) values (?, ?)').run(note.id, JSON.stringify(note));
}

export function listNotes(): Note[] {
  const rows = getDb().prepare('select json from notes').all() as { json: string }[];
  return rows.map((r) => JSON.parse(r.json) as Note).sort((a, b) => b.created_at.localeCompare(a.created_at));
}
