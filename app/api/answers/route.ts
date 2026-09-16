import { listAnswers } from '@/lib/db';
import { createAnswer, fallbackFor, toResponse } from '@/lib/pipeline';
import type { ApiError, CreateAnswerRequest } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET() {
  return Response.json({ answers: await listAnswers() });
}

export async function POST(request: Request) {
  let body: CreateAnswerRequest;
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
    const answer = await createAnswer(question, body.date);
    return Response.json(await toResponse(answer));
  } catch (err) {
    console.error('POST /api/answers failed', err);
    return Response.json(
      { error: 'No findings were produced. The retrieved passages are shown below.', fallback: await safeFallback({ question, date: body.date }) } satisfies ApiError,
      { status: 502 },
    );
  }
}

async function safeFallback(casus: Parameters<typeof fallbackFor>[0]): Promise<ApiError['fallback']> {
  try {
    return await fallbackFor(casus);
  } catch (err) {
    console.error('fallback search failed', err);
    return undefined;
  }
}
