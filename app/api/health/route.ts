import { dbBackend, listSources } from '@/lib/db';
import { usingSupabaseStorage } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Which backends the deployment uses and whether they answer. Names only, never values. */
export async function GET() {
  const present = (name: string) => !!process.env[name];
  const env = Object.fromEntries(
    ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'POSTGRES_URL', 'DATABASE_URL', 'OPENAI_API_KEY', 'DEMO_PASSWORD'].map((n) => [n, present(n)]),
  );
  let sources: number | string;
  try {
    sources = (await listSources()).length;
  } catch (err) {
    sources = `error: ${err instanceof Error ? err.message.slice(0, 160) : 'unknown'}`;
  }
  return Response.json({ database: dbBackend(), files: usingSupabaseStorage() ? 'supabase' : 'local', sources, env });
}
