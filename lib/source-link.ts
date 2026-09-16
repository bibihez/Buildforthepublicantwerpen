/** Opens the cited-source viewer with enough context to locate and highlight the verified quote. */
export function sourceDocumentHref(sourceId: string, page: number, quote?: string, pageTo = page): string {
  const normalizedQuote = quote?.replace(/\s+/g, " ").trim();
  const from = Math.max(1, Math.trunc(page));
  const to = Math.max(from, Math.trunc(pageTo));
  const search = normalizedQuote ? `&quote=${encodeURIComponent(normalizedQuote)}` : "";
  return `/source/${encodeURIComponent(sourceId)}?from=${from}&to=${to}${search}`;
}
