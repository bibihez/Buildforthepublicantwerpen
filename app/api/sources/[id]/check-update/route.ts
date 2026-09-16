import { getSource } from '@/lib/db';
import { fail } from '@/lib/http';
import { checkForNewVersion } from '@/lib/websearch';

export const runtime = 'nodejs';
export const maxDuration = 120;

// POST /api/sources/[id]/check-update → WebSearchResponse. Never changes the source.
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const source = await getSource(id);
  if (!source) return fail('Source not found', 404);
  try {
    return Response.json(await checkForNewVersion(source));
  } catch (err) {
    console.error('POST /api/sources/[id]/check-update failed', err);
    return fail('Searching for a newer version failed. Please try again.', 502);
  }
}
