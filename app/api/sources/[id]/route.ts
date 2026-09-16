import { fail, handleError, readJson } from '@/lib/http';
import { setActive } from '@/lib/sources';

export const runtime = 'nodejs';

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const body = await readJson<{ active: boolean; reason: string; by: string }>(request);
    if (typeof body.active !== 'boolean') return fail('The active field is missing', 400);
    return Response.json({ source: setActive(id, body.active, body.reason, body.by) });
  } catch (err) {
    return handleError('PATCH /api/sources/[id]', err);
  }
}
