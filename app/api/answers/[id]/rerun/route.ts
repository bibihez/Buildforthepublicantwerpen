import { getAnswer } from '@/lib/db';
import { analyse, toResponse } from '@/lib/pipeline';
import type { ApiError, RerunRequest } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** Same pipeline without AI ①: the officer's case (facts, date, subquestions) is taken as given. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const existing = getAnswer(id);
  if (!existing) return Response.json({ error: 'Antwoord niet gevonden' } satisfies ApiError, { status: 404 });
  if (existing.status === 'goedgekeurd') {
    return Response.json({ error: 'Dit antwoord is goedgekeurd. Maak een nieuwe versie.' } satisfies ApiError, { status: 409 });
  }
  let body: RerunRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Ongeldige aanvraag' } satisfies ApiError, { status: 400 });
  }
  if (body.revision !== existing.revision) {
    return Response.json({ error: 'Dit antwoord werd intussen gewijzigd. Herlaad de pagina.' } satisfies ApiError, { status: 409 });
  }
  if (!body.casus?.question || !Array.isArray(body.casus.subquestions) || !Array.isArray(body.casus.facts)) {
    return Response.json({ error: 'Ongeldige casus' } satisfies ApiError, { status: 400 });
  }
  try {
    const answer = await analyse({ ...body.casus, municipality: existing.casus.municipality }, existing);
    return Response.json(toResponse(answer));
  } catch (err) {
    console.error('POST /api/answers/[id]/rerun failed', err);
    return Response.json({ error: 'Geen bevindingen opgesteld. Probeer opnieuw.' } satisfies ApiError, { status: 502 });
  }
}
