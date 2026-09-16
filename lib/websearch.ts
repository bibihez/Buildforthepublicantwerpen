import OpenAI from 'openai';
import { models } from './llm';
import type { WebSearchResponse, WebSearchResult } from './types';

/** Government domains a Flemish municipality's officer can treat as official publishers. */
export const OFFICIAL_DOMAINS = [
  'schoten.be',
  'provincieantwerpen.be',
  'vlaanderen.be',
  'vlaio.be',
  'omgevingsloket.be',
  'favv-afsca.be',
  'belgium.be',
  'economie.fgov.be',
  'ejustice.just.fgov.be',
  'codex.vlaanderen.be',
];

const INSTRUCTIONS = `You help a local economy officer in Schoten (Province of Antwerp, Flanders, Belgium).
Search the web for OFFICIAL documents (regulations, fee rules, government guidance) that answer the entrepreneur's question.
Write 2-4 short Dutch sentences: which documents you found, who published them, and their date or version if visible.
Do not answer the question yourself and do not give advice. Always cite the pages you used.`;

let client: OpenAI | null = null;

const isOfficial = (domain: string) => OFFICIAL_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));

/**
 * Web search to FIND sources. Results are leads, never evidence: an officer must download and upload a document
 * before any finding can quote it.
 */
export async function webSearch(question: string, { allDomains = false } = {}): Promise<WebSearchResponse> {
  client ??= new OpenAI({ timeout: 90_000, maxRetries: 1 });
  const model = models.fast();
  const res = await client.responses.create({
    model,
    instructions: INSTRUCTIONS,
    input: question,
    reasoning: { effort: 'low' },
    tools: [
      {
        type: 'web_search',
        search_context_size: 'low',
        user_location: { type: 'approximate', country: 'BE', city: 'Schoten', region: 'Antwerpen' },
        ...(allDomains ? {} : { filters: { allowed_domains: OFFICIAL_DOMAINS } }),
      },
    ],
  });

  const results = new Map<string, WebSearchResult>();
  for (const item of res.output) {
    if (item.type !== 'message') continue;
    for (const part of item.content) {
      if (part.type !== 'output_text') continue;
      for (const a of part.annotations) {
        if (a.type !== 'url_citation') continue;
        const url = a.url.replace(/[?&]utm_source=openai$/, '');
        if (results.has(url)) continue;
        let domain = '';
        try {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          continue;
        }
        results.set(url, { title: a.title || domain, url, domain, official: isOfficial(domain) });
      }
    }
  }

  return {
    summary: res.output_text.replace(/\s*\(\[[^\]]*\]\([^)]*\)\)/g, '').replace(/\*\*/g, '').trim(),
    results: [...results.values()],
    all_domains: allDomains,
    searched_at: new Date().toISOString(),
    model,
  };
}
