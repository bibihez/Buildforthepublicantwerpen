import fs from 'node:fs';
import path from 'node:path';
import type BetterSqlite3 from 'better-sqlite3';
import type postgres from 'postgres';
import type { Answer, Note, Passage, Source, SourceEvent } from './types';

// Each row stores its full object as JSON, so adding a field to lib/types.ts never needs a migration.
// Backend, in order: Supabase REST (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) · Postgres (DATABASE_URL / POSTGRES_URL)
// · a local SQLite file. Supabase tables are created once with the SQL in SCHEMA.
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PG_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const DB_PATH = process.env.BRONWIJZER_DB ?? path.join(process.cwd(), 'data', 'bronwijzer.db');

type Backend = 'supabase' | 'postgres' | 'sqlite';
const BACKEND: Backend = SUPABASE_URL && SUPABASE_KEY ? 'supabase' : PG_URL ? 'postgres' : 'sqlite';
export const dbBackend = () => BACKEND;
export const usingPostgres = () => BACKEND !== 'sqlite';

export const SCHEMA = [
  'create table if not exists sources (id text primary key, json text not null)',
  'create table if not exists passages (id text primary key, source_id text not null, json text not null)',
  'create index if not exists passages_source on passages (source_id)',
  'create table if not exists source_events (id text primary key, source_id text not null, at text not null, json text not null)',
  'create table if not exists answers (id text primary key, created_at text not null, status text not null, json text not null)',
  'create table if not exists notes (id text primary key, json text not null)',
];

type Table = 'sources' | 'passages' | 'source_events' | 'answers' | 'notes';
type Row = Record<string, unknown>;
const TABLES: Table[] = ['sources', 'passages', 'source_events', 'answers', 'notes'];

/** The few operations the app needs, on any backend. */
type Store = {
  upsert(table: Table, rows: Row[]): Promise<void>;
  byId(table: Table, id: string): Promise<Row | null>;
  all(table: Table, opts?: { where?: [string, string]; orderBy?: string; desc?: boolean; columns?: string }): Promise<Row[]>;
  clear(table: Table): Promise<void>;
  close(): Promise<void>;
};

// --- Supabase (PostgREST) ------------------------------------------------------

async function openSupabase(): Promise<Store> {
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const PAGE = 1000;
  const fail = (table: string, error: { message: string } | null) => {
    if (error) throw new Error(`Supabase ${table}: ${error.message}`);
  };
  return {
    async upsert(table, rows) {
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await db.from(table).upsert(rows.slice(i, i + 500), { onConflict: 'id' });
        fail(table, error);
      }
    },
    async byId(table, id) {
      const { data, error } = await db.from(table).select('*').eq('id', id).maybeSingle();
      fail(table, error);
      return (data as Row | null) ?? null;
    },
    async all(table, opts = {}) {
      const out: Row[] = [];
      for (let from = 0; ; from += PAGE) {
        let q = db.from(table).select(opts.columns ?? '*');
        if (opts.where) q = q.eq(opts.where[0], opts.where[1]);
        q = q.order(opts.orderBy ?? 'id', { ascending: !opts.desc }).range(from, from + PAGE - 1);
        const { data, error } = await q;
        fail(table, error);
        out.push(...((data ?? []) as unknown as Row[]));
        if (!data || data.length < PAGE) return out;
      }
    },
    async clear(table) {
      const { error } = await db.from(table).delete().neq('id', '');
      fail(table, error);
    },
    async close() {},
  };
}

// --- SQL (Postgres or SQLite) --------------------------------------------------

type Sql = { query(q: string, params?: unknown[]): Promise<Row[]>; batch(q: string, rows: unknown[][]): Promise<void>; close(): Promise<void> };

async function openPostgres(): Promise<Sql> {
  const { default: pg } = await import('postgres');
  // Supabase's transaction pooler does not support prepared statements.
  const sql: postgres.Sql = pg(PG_URL, { prepare: false, max: 3, idle_timeout: 20, ssl: 'require' });
  for (const stmt of SCHEMA) await sql.unsafe(stmt);
  return {
    query: async (q, params = []) => (await sql.unsafe(q, params as never[])) as unknown as Row[],
    batch: async (q, rows) => {
      await sql.begin(async (tx) => {
        for (const r of rows) await tx.unsafe(q, r as never[]);
      });
    },
    close: () => sql.end(),
  };
}

async function openSqlite(): Promise<Sql> {
  const { default: Database } = await import('better-sqlite3');
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db: BetterSqlite3.Database = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  for (const stmt of SCHEMA) db.exec(stmt);
  const positional = (q: string) => q.replace(/\$\d+/g, '?');
  return {
    query: async (q, params = []) => {
      const stmt = db.prepare(positional(q));
      if (stmt.reader) return stmt.all(...params) as Row[];
      stmt.run(...params);
      return [];
    },
    batch: async (q, rows) => {
      const stmt = db.prepare(positional(q));
      db.transaction((items: unknown[][]) => {
        for (const r of items) stmt.run(...r);
      })(rows);
    },
    close: async () => {
      db.close();
    },
  };
}

function sqlStore(sql: Sql): Store {
  return {
    async upsert(table, rows) {
      if (!rows.length) return;
      const cols = Object.keys(rows[0]);
      const q =
        `insert into ${table} (${cols.join(', ')}) values (${cols.map((_, i) => `$${i + 1}`).join(', ')}) ` +
        `on conflict (id) do update set ${cols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ')}`;
      await sql.batch(q, rows.map((r) => cols.map((c) => r[c])));
    },
    async byId(table, id) {
      return (await sql.query(`select * from ${table} where id = $1`, [id]))[0] ?? null;
    },
    async all(table, opts = {}) {
      const where = opts.where ? ` where ${opts.where[0]} = $1` : '';
      const order = opts.orderBy ? ` order by ${opts.orderBy}${opts.desc ? ' desc' : ''}` : '';
      return sql.query(`select ${opts.columns ?? '*'} from ${table}${where}${order}`, opts.where ? [opts.where[1]] : []);
    },
    async clear(table) {
      await sql.query(`delete from ${table}`);
    },
    close: () => sql.close(),
  };
}

let storePromise: Promise<Store> | null = null;

function store(): Promise<Store> {
  storePromise ??=
    BACKEND === 'supabase' ? openSupabase() : BACKEND === 'postgres' ? openPostgres().then(sqlStore) : openSqlite().then(sqlStore);
  return storePromise;
}

/** Empties every table (Supabase / Postgres) or deletes the SQLite file. */
export async function resetDb(): Promise<void> {
  if (BACKEND !== 'sqlite') {
    const s = await store();
    for (const t of TABLES) await s.clear(t);
    return;
  }
  await closeDb();
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(DB_PATH + suffix, { force: true });
}

export async function closeDb(): Promise<void> {
  if (storePromise) await (await storePromise).close();
  storePromise = null;
}

const parse = <T>(row: Row | null): T | null => (row ? (JSON.parse(String(row.json)) as T) : null);
const parseAll = <T>(rows: Row[]): T[] => rows.map((r) => JSON.parse(String(r.json)) as T);

// --- sources ---------------------------------------------------------------

export async function upsertSource(source: Source): Promise<void> {
  await (await store()).upsert('sources', [{ id: source.id, json: JSON.stringify(source) }]);
}

export async function getSource(id: string): Promise<Source | null> {
  return parse<Source>(await (await store()).byId('sources', id));
}

export async function listSources(): Promise<Source[]> {
  return parseAll<Source>(await (await store()).all('sources'));
}

export async function findSourceBySha(sha256: string): Promise<Source | null> {
  return (await listSources()).find((s) => s.sha256 === sha256) ?? null;
}

// --- passages --------------------------------------------------------------

export async function insertPassages(passages: Passage[]): Promise<void> {
  await (await store()).upsert(
    'passages',
    passages.map((p) => ({ id: p.id, source_id: p.source_id, json: JSON.stringify(p) })),
  );
}

export async function getPassagesBySource(sourceId: string): Promise<Passage[]> {
  return parseAll<Passage>(await (await store()).all('passages', { where: ['source_id', sourceId] }));
}

export async function listPassages(): Promise<Passage[]> {
  return parseAll<Passage>(await (await store()).all('passages'));
}

export async function getPassage(id: string): Promise<Passage | null> {
  return parse<Passage>(await (await store()).byId('passages', id));
}

export async function countPassagesBySource(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const r of await (await store()).all('passages', { columns: 'id, source_id' })) {
    const id = String(r.source_id);
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

// --- source events (append-only) -------------------------------------------

export async function addSourceEvent(event: SourceEvent): Promise<void> {
  await (await store()).upsert('source_events', [
    { id: event.id, source_id: event.source_id, at: event.at, json: JSON.stringify(event) },
  ]);
}

export async function listSourceEvents(sourceId?: string): Promise<SourceEvent[]> {
  return parseAll<SourceEvent>(
    await (await store()).all('source_events', { orderBy: 'at', ...(sourceId ? { where: ['source_id', sourceId] as [string, string] } : {}) }),
  );
}

// --- answers ---------------------------------------------------------------

export async function saveAnswer(answer: Answer): Promise<void> {
  await (await store()).upsert('answers', [
    { id: answer.id, created_at: answer.created_at, status: answer.status, json: JSON.stringify(answer) },
  ]);
}

export async function getAnswer(id: string): Promise<Answer | null> {
  return parse<Answer>(await (await store()).byId('answers', id));
}

export async function listAnswers(): Promise<Answer[]> {
  return parseAll<Answer>(await (await store()).all('answers', { orderBy: 'created_at', desc: true }));
}

// --- notes (officer knowledge, never evidence) -----------------------------

export async function saveNote(note: Note): Promise<void> {
  await (await store()).upsert('notes', [{ id: note.id, json: JSON.stringify(note) }]);
}

export async function listNotes(): Promise<Note[]> {
  return parseAll<Note>(await (await store()).all('notes')).sort((a, b) => b.created_at.localeCompare(a.created_at));
}
