import fs from 'node:fs';
import path from 'node:path';
import { getSource } from '@/lib/db';

export const runtime = 'nodejs';

/** Serves a source's PDF so "Open bron" can link to /files/{id}#page={n}. Only files under data/files. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const source = getSource(id);
  if (!source?.file_path) return new Response('Source has no file', { status: 404 });
  const root = path.join(process.cwd(), 'data', 'files');
  const abs = path.resolve(process.cwd(), source.file_path);
  if (!abs.startsWith(root + path.sep) || !fs.existsSync(abs)) return new Response('File not found', { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(abs)), {
    headers: { 'content-type': 'application/pdf', 'content-disposition': `inline; filename="${path.basename(abs)}"` },
  });
}
