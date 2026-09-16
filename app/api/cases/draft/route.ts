import { draftCase } from '@/lib/pipeline';
import type { ApiError, DraftCaseRequest } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Builds an editable research brief. It does not search sources or persist an answer. */
export async function POST(request: Request) {
  let body: DraftCaseRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request' } satisfies ApiError, { status: 400 });
  }

  const question = body?.question?.trim();
  if (!question) return Response.json({ error: 'No question provided' } satisfies ApiError, { status: 400 });
  if (body.date && !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return Response.json({ error: 'Date must use the YYYY-MM-DD format' } satisfies ApiError, { status: 400 });
  }

  try {
    return Response.json({ casus: await draftCase(question, body.date) });
  } catch (err) {
    console.error('POST /api/cases/draft failed', err);
    return Response.json({ error: 'The case could not be built. Try again.' } satisfies ApiError, { status: 502 });
  }
}
