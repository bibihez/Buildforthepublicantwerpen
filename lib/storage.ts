import fs from 'node:fs';
import path from 'node:path';

// Source PDFs. Local: data/files on disk. Deployed: a private Supabase Storage bucket, same relative keys.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = process.env.SUPABASE_BUCKET || 'bronnen';

export const usingSupabaseStorage = () => !!(SUPABASE_URL && SUPABASE_KEY);

async function bucket() {
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data } = await client.storage.getBucket(BUCKET);
  if (!data) await client.storage.createBucket(BUCKET, { public: false });
  return client.storage.from(BUCKET);
}

/** Only keys under data/files/, so a stored path can never point elsewhere on disk. */
function checkKey(key: string): string {
  const normal = path.posix.normalize(key.replace(/\\/g, '/'));
  if (!normal.startsWith('data/files/') || normal.includes('..')) throw new Error(`Invalid file key: ${key}`);
  return normal;
}

export async function saveFile(key: string, data: Uint8Array): Promise<void> {
  const k = checkKey(key);
  if (usingSupabaseStorage()) {
    const { error } = await (await bucket()).upload(k, data, { contentType: 'application/pdf', upsert: true });
    if (error) throw error;
    return;
  }
  const abs = path.join(process.cwd(), k);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, data);
}

export async function readFile(key: string): Promise<Uint8Array | null> {
  const k = checkKey(key);
  if (usingSupabaseStorage()) {
    const { data, error } = await (await bucket()).download(k);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  }
  const abs = path.join(process.cwd(), k);
  return fs.existsSync(abs) ? new Uint8Array(fs.readFileSync(abs)) : null;
}
