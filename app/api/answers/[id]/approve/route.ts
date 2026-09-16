import { getAnswer, listPassages, listSources, saveAnswer } from '@/lib/db';
import { fail, handleError, readJson } from '@/lib/http';
import { toResponse } from '@/lib/pipeline';
import { getApproveBlockers } from '@/lib/review-policy';
import { approve, buildSnapshot } from '@/lib/snapshot';
import type { ApproveRequest } from '@/lib/types';

export const runtime = 'nodejs';

/** Approves one revision and freezes it. Refuses with the full list of blockers. Never sends anything. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const answer = getAnswer(id);
    if (!answer) return fail('Antwoord niet gevonden', 404);
    const body = await readJson<ApproveRequest>(request);
    const approvedBy = body.approved_by?.trim();
    if (!approvedBy) return fail('Naam van de medewerker ontbreekt', 400);

    const blockers = getApproveBlockers(answer, body.revision);
    if (blockers.length) return fail('Goedkeuren kan nog niet', 409, { blockers });

    const now = new Date().toISOString();
    const approved = approve(answer, buildSnapshot(answer, listSources(), listPassages(), approvedBy, now));
    saveAnswer(approved);
    return Response.json(toResponse(approved));
  } catch (err) {
    return handleError('POST /api/answers/[id]/approve', err);
  }
}
