import path from 'node:path';
import { getSource } from '@/lib/db';
import { readFile } from '@/lib/storage';

export const runtime = 'nodejs';

/** Serves a source's PDF so "Open source" can link to /files/{id}#page={n}. Only files under data/files. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const source = await getSource(id);
  if (!source?.file_path) return new Response('Source has no file', { status: 404 });
  let data: Uint8Array | null;
  try {
    data = await readFile(source.file_path);
  } catch {
    return new Response('File not found', { status: 404 });
  }
  if (!data) return new Response('File not found', { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: { 'content-type': 'application/pdf', 'content-disposition': `inline; filename="${path.basename(source.file_path)}"` },
  });
}
