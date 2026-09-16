import OpenAI from 'openai';
import { fail } from '@/lib/http';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MODEL = process.env.OPENAI_MODEL_TRANSCRIBE || 'gpt-4o-transcribe';

/** Speech to text for dictated notes (Flemish Dutch). The officer edits the transcript before saving. */
export async function POST(request: Request) {
  let audio: FormDataEntryValue | null;
  try {
    audio = (await request.formData()).get('audio');
  } catch {
    return fail('Verwacht een formulier met audio', 400);
  }
  if (!(audio instanceof File) || audio.size === 0) return fail('Geen opname ontvangen', 400);
  if (audio.size > 20 * 1024 * 1024) return fail('Opname te lang', 400);
  try {
    const openai = new OpenAI({ timeout: 90_000, maxRetries: 1 });
    const result = await openai.audio.transcriptions.create({
      file: audio,
      model: MODEL,
      language: 'nl',
      prompt: 'Notitie van een medewerker lokale economie in Schoten: markt, standplaats, retributie, FAVV, VLAIO, terras.',
    });
    return Response.json({ text: result.text, model: MODEL });
  } catch (err) {
    console.error('POST /api/voice failed', err);
    return fail('Omzetten naar tekst is mislukt. Typ de notitie of probeer opnieuw.', 502);
  }
}
