import { randomUUID } from 'node:crypto';
import { listNotes, saveNote } from './db';
import { similarity } from './precedent';
import { RequestError } from './snapshot';
import type { CreateNoteRequest, Note } from './types';

export function createNote(req: CreateNoteRequest): Note {
  const topic = req.topic?.trim();
  const text = req.text?.trim();
  const author = req.author?.trim();
  if (!topic) throw new RequestError('Onderwerp ontbreekt', 400);
  if (!text) throw new RequestError('Tekst ontbreekt', 400);
  if (!author) throw new RequestError('Naam van de medewerker ontbreekt', 400);
  const note: Note = { id: randomUUID(), topic, text, author, created_at: new Date().toISOString(), dictated: !!req.dictated };
  saveNote(note);
  return note;
}

/** With a question: only notes that share words with it, most relevant first. Without: all, newest first. */
export function findNotes(question?: string | null): Note[] {
  const notes = listNotes();
  if (!question?.trim()) return notes;
  return notes
    .map((n) => ({ n, score: similarity(question, `${n.topic} ${n.text}`) }))
    .filter((x) => x.score >= 0.25)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.n);
}
