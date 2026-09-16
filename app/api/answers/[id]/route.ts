import { getAnswer, saveAnswer } from '@/lib/db';
import { fail, handleError, readJson } from '@/lib/http';
import { toResponse } from '@/lib/pipeline';
import { applyUpdate } from '@/lib/snapshot';
import type { UpdateAnswerRequest } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const answer = getAnswer(id);
  if (!answer) return fail('Answer not found', 404);
  return Response.json(toResponse(answer));
}

/** Saves facts, reviews, not-found decisions and reply text. Never calls AI. 409 once approved. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const answer = getAnswer(id);
    if (!answer) return fail('Answer not found', 404);
    const body = await readJson<UpdateAnswerRequest>(request);
    const next = applyUpdate(answer, body, new Date().toISOString());
    saveAnswer(next);
    return Response.json(toResponse(next));
  } catch (err) {
    return handleError('PATCH /api/answers/[id]', err);
  }
}
