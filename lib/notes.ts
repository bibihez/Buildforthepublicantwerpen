import { randomUUID } from 'node:crypto';
import { listNotes, saveNote } from './db';
import { similarity } from './precedent';
import { expandSearchQuery } from './search';
import { RequestError } from './snapshot';
import type { CreateNoteRequest, Note } from './types';

export async function createNote(req: CreateNoteRequest): Promise<Note> {
  const topic = req.topic?.trim();
  const text = req.text?.trim();
  const author = req.author?.trim();
  if (!topic) throw new RequestError('Topic is missing', 400);
  if (!text) throw new RequestError('Text is missing', 400);
  if (!author) throw new RequestError('Officer name is missing', 400);
  const note: Note = { id: randomUUID(), topic, text, author, created_at: new Date().toISOString(), dictated: !!req.dictated };
  await saveNote(note);
  return note;
}

/** With a question: only notes that share words with it, most relevant first. Without: all, newest first. */
export async function findNotes(question?: string | null): Promise<Note[]> {
  const notes = await listNotes();
  if (!question?.trim()) return notes;
  const matchingQuestion = expandSearchQuery(question);
  return notes
    .map((n) => ({ n, score: similarity(matchingQuestion, `${n.topic} ${n.text}`) }))
    .filter((x) => x.score >= 0.25)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.n);
}
