import { fail, handleError, readJson } from '@/lib/http';
import type { WebSearchRequest } from '@/lib/types';
import { webSearch } from '@/lib/websearch';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(request: Request) {
  let body: WebSearchRequest;
  try {
    body = await readJson<WebSearchRequest>(request);
  } catch (err) {
    return handleError('POST /api/web-search', err);
  }
  const question = body?.question?.trim();
  if (!question) return fail('Geen zoekvraag opgegeven', 400);
  try {
    return Response.json(await webSearch(question, { allDomains: body.all_domains === true }));
  } catch (err) {
    console.error('POST /api/web-search failed', err);
    return fail('Zoeken op internet is mislukt. Probeer opnieuw.', 502);
  }
}
