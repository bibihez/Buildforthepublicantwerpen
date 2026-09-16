import fs from 'node:fs';
import path from 'node:path';
import type BetterSqlite3 from 'better-sqlite3';
import type postgres from 'postgres';
import type { Answer, Note, Passage, Source, SourceEvent } from './types';

// Each row stores its full object as JSON, so adding a field to lib/types.ts never needs a migration.
// Local: SQLite file. Deployed: Postgres (Supabase) when DATABASE_URL or POSTGRES_URL is set.
const PG_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const DB_PATH = process.env.BRONWIJZER_DB ?? path.join(process.cwd(), 'data', 'bronwijzer.db');

export const usingPostgres = () => !!PG_URL;

const SCHEMA = [
  'create table if not exists sources (id text primary key, json text not null)',
  'create table if not exists passages (id text primary key, source_id text not null, json text not null)',
  'create index if not exists passages_source on passages (source_id)',
  'create table if not exists source_events (id text primary key, source_id text not null, at text not null, json text not null)',
  'create table if not exists answers (id text primary key, created_at text not null, status text not null, json text not null)',
  'create table if not exists notes (id text primary key, json text not null)',
];

type Row = Record<string, unknown>;
type Db = {
  all(sql: string, params?: unknown[]): Promise<Row[]>;
  run(sql: string, params?: unknown[]): Promise<void>;
  batch(sql: string, rows: unknown[][]): Promise<void>;
  close(): Promise<void>;
};

let dbPromise: Promise<Db> | null = null;

async function openPostgres(): Promise<Db> {
  const { default: pg } = await import('postgres');
  // Supabase's transaction pooler does not support prepared statements.
  const sql: postgres.Sql = pg(PG_URL, { prepare: false, max: 3, idle_timeout: 20, ssl: 'require' });
  for (const stmt of SCHEMA) await sql.unsafe(stmt);
  return {
    all: async (q, params = []) => (await sql.unsafe(q, params as never[])) as unknown as Row[],
    run: async (q, params = []) => {
      await sql.unsafe(q, params as never[]);
    },
    batch: async (q, rows) => {
      await sql.begin(async (tx) => {
        for (const r of rows) await tx.unsafe(q, r as never[]);
      });
    },
    close: () => sql.end(),
  };
}

async function openSqlite(): Promise<Db> {
  const { default: Database } = await import('better-sqlite3');
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db: BetterSqlite3.Database = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  for (const stmt of SCHEMA) db.exec(stmt);
  // Queries are written with $1, $2 … (Postgres); SQLite gets them positionally.
  const toSqlite = (q: string) => q.replace(/\$\d+/g, '?');
  return {
    all: async (q, params = []) => db.prepare(toSqlite(q)).all(...params) as Row[],
    run: async (q, params = []) => {
      db.prepare(toSqlite(q)).run(...params);
    },
    batch: async (q, rows) => {
      const stmt = db.prepare(toSqlite(q));
      db.transaction((items: unknown[][]) => {
        for (const r of items) stmt.run(...r);
      })(rows);
    },
    close: async () => {
      db.close();
    },
  };
}

function getDb(): Promise<Db> {
  dbPromise ??= PG_URL ? openPostgres() : openSqlite();
  return dbPromise;
}

/** Empties every table (Postgres) or deletes the SQLite file. */
export async function resetDb(): Promise<void> {
  if (PG_URL) {
    const db = await getDb();
    for (const t of ['sources', 'passages', 'source_events', 'answers', 'notes']) await db.run(`delete from ${t}`);
    return;
  }
  if (dbPromise) {
    await (await dbPromise).close();
    dbPromise = null;
  }
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(DB_PATH + suffix, { force: true });
}

export async function closeDb(): Promise<void> {
  if (dbPromise) await (await dbPromise).close();
  dbPromise = null;
}

const json = <T>(rows: Row[]): T[] => rows.map((r) => JSON.parse(String(r.json)) as T);
const first = <T>(rows: Row[]): T | null => json<T>(rows)[0] ?? null;

// --- sources ---------------------------------------------------------------

export async function upsertSource(source: Source): Promise<void> {
  await (await getDb()).run(
    'insert into sources (id, json) values ($1, $2) on conflict (id) do update set json = excluded.json',
    [source.id, JSON.stringify(source)],
  );
}

export async function getSource(id: string): Promise<Source | null> {
  return first<Source>(await (await getDb()).all('select json from sources where id = $1', [id]));
}

export async function listSources(): Promise<Source[]> {
  return json<Source>(await (await getDb()).all('select json from sources'));
}

export async function findSourceBySha(sha256: string): Promise<Source | null> {
  return (await listSources()).find((s) => s.sha256 === sha256) ?? null;
}

// --- passages --------------------------------------------------------------

export async function insertPassages(passages: Passage[]): Promise<void> {
  await (await getDb()).batch(
    'insert into passages (id, source_id, json) values ($1, $2, $3) on conflict (id) do update set source_id = excluded.source_id, json = excluded.json',
    passages.map((p) => [p.id, p.source_id, JSON.stringify(p)]),
  );
}

export async function getPassagesBySource(sourceId: string): Promise<Passage[]> {
  return json<Passage>(await (await getDb()).all('select json from passages where source_id = $1', [sourceId]));
}

export async function listPassages(): Promise<Passage[]> {
  return json<Passage>(await (await getDb()).all('select json from passages'));
}

export async function getPassage(id: string): Promise<Passage | null> {
  return first<Passage>(await (await getDb()).all('select json from passages where id = $1', [id]));
}

export async function countPassagesBySource(): Promise<Record<string, number>> {
  const rows = await (await getDb()).all('select source_id, count(*) as n from passages group by source_id');
  return Object.fromEntries(rows.map((r) => [String(r.source_id), Number(r.n)]));
}

// --- source events (append-only) -------------------------------------------

export async function addSourceEvent(event: SourceEvent): Promise<void> {
  await (await getDb()).run('insert into source_events (id, source_id, at, json) values ($1, $2, $3, $4)', [
    event.id,
    event.source_id,
    event.at,
    JSON.stringify(event),
  ]);
}

export async function listSourceEvents(sourceId?: string): Promise<SourceEvent[]> {
  const db = await getDb();
  const rows = sourceId
    ? await db.all('select json from source_events where source_id = $1 order by at', [sourceId])
    : await db.all('select json from source_events order by at');
  return json<SourceEvent>(rows);
}

// --- answers ---------------------------------------------------------------

export async function saveAnswer(answer: Answer): Promise<void> {
  await (await getDb()).run(
    'insert into answers (id, created_at, status, json) values ($1, $2, $3, $4) on conflict (id) do update set created_at = excluded.created_at, status = excluded.status, json = excluded.json',
    [answer.id, answer.created_at, answer.status, JSON.stringify(answer)],
  );
}

export async function getAnswer(id: string): Promise<Answer | null> {
  return first<Answer>(await (await getDb()).all('select json from answers where id = $1', [id]));
}

export async function listAnswers(): Promise<Answer[]> {
  return json<Answer>(await (await getDb()).all('select json from answers order by created_at desc'));
}

// --- notes (officer knowledge, never evidence) -----------------------------

export async function saveNote(note: Note): Promise<void> {
  await (await getDb()).run('insert into notes (id, json) values ($1, $2) on conflict (id) do update set json = excluded.json', [
    note.id,
    JSON.stringify(note),
  ]);
}

export async function listNotes(): Promise<Note[]> {
  return json<Note>(await (await getDb()).all('select json from notes')).sort((a, b) => b.created_at.localeCompare(a.created_at));
}
