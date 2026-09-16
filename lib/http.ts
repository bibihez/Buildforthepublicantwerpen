import { RequestError } from './snapshot';
import type { ApiError } from './types';

export const fail = (error: string, status: number, extra: Partial<ApiError> = {}) =>
  Response.json({ error, ...extra } satisfies ApiError, { status });

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new RequestError('Invalid request', 400);
  }
}

/** Turns a RequestError into its status; anything else is logged and becomes a 500. */
export function handleError(where: string, err: unknown): Response {
  if (err instanceof RequestError) return fail(err.message, err.status);
  console.error(where, err);
  return fail('Something went wrong on the server', 500);
}
