import { getAnswer } from '@/lib/db';
import { analyse, fallbackFor, toResponse } from '@/lib/pipeline';
import type { ApiError, RerunRequest } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** Same pipeline without AI ①: the officer's case (facts, date, subquestions) is taken as given. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const existing = await getAnswer(id);
  if (!existing) return Response.json({ error: 'Answer not found' } satisfies ApiError, { status: 404 });
  if (existing.status === 'goedgekeurd') {
    return Response.json({ error: 'This answer is approved. Create a new version.' } satisfies ApiError, { status: 409 });
  }
  let body: RerunRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request' } satisfies ApiError, { status: 400 });
  }
  if (body.revision !== existing.revision) {
    return Response.json({ error: 'This answer has changed. Reload the page.' } satisfies ApiError, { status: 409 });
  }
  if (!body.casus?.question || !Array.isArray(body.casus.subquestions) || !Array.isArray(body.casus.facts)) {
    return Response.json({ error: 'Invalid case' } satisfies ApiError, { status: 400 });
  }
  try {
    const answer = await analyse({ ...body.casus, municipality: existing.casus.municipality }, existing);
    return Response.json(await toResponse(answer));
  } catch (err) {
    console.error('POST /api/answers/[id]/rerun failed', err);
    let fallback: ApiError['fallback'];
    try {
      fallback = await fallbackFor(body.casus);
    } catch {
      fallback = undefined;
    }
    return Response.json({ error: 'No findings were produced. The retrieved passages are shown below.', fallback } satisfies ApiError, { status: 502 });
  }
}
