import { handleError, readJson } from '@/lib/http';
import { createNote, findNotes } from '@/lib/notes';
import type { CreateNoteRequest } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q');
  return Response.json({ notes: findNotes(q) });
}

export async function POST(request: Request) {
  try {
    const body = await readJson<CreateNoteRequest>(request);
    return Response.json({ note: createNote(body) });
  } catch (err) {
    return handleError('POST /api/notes', err);
  }
}
