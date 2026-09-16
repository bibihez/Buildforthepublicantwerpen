import fs from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { z } from 'zod';

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!client) client = new OpenAI({ timeout: 120_000, maxRetries: 1 });
  return client;
}

export const models = {
  fast: () => process.env.OPENAI_MODEL_FAST || 'gpt-5.4-mini',
  strong: () => process.env.OPENAI_MODEL_STRONG || 'gpt-5.5',
};

export function loadPrompt(name: string): string {
  return fs.readFileSync(path.join(process.cwd(), 'prompts', `${name}.md`), 'utf8');
}

/** Structured JSON call. A response that fails the schema is retried once, then the error is thrown. */
export async function callJson<T extends z.ZodType>(
  model: string,
  system: string,
  user: string,
  schema: T,
  { name = 'result', effort = 'low' as 'low' | 'medium' | 'high' } = {},
): Promise<z.infer<T>> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await openai().responses.parse({
        model,
        instructions: system,
        input: user,
        reasoning: { effort },
        text: { format: zodTextFormat(schema, name) },
      });
      if (res.output_parsed == null) throw new Error('Leeg antwoord van het model');
      return schema.parse(res.output_parsed);
    } catch (err) {
      lastError = err;
      if (err instanceof OpenAI.APIError && err.status !== undefined && err.status < 500 && err.status !== 429) break;
    }
  }
  throw lastError;
}
