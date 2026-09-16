import { randomUUID } from 'node:crypto';
import { getAnswer, saveAnswer } from '@/lib/db';
import { fail } from '@/lib/http';
import { toResponse } from '@/lib/pipeline';
import { newVersion } from '@/lib/snapshot';

export const runtime = 'nodejs';

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parent = getAnswer(id);
  if (!parent) return fail('Answer not found', 404);
  const draft = newVersion(parent, randomUUID(), new Date().toISOString());
  saveAnswer(draft);
  return Response.json(toResponse(draft));
}
