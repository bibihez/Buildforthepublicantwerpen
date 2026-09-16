/**
 * Number check: every amount, date part or count a statement uses must appear in the quotes it cites.
 * Written for Dutch notation: "1.250,50" = 1250.5 · "6,00" = 6 · "78" = 78.
 */

// A number, optionally with thousands dots and a decimal comma (or a plain decimal dot).
const NUMBER = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?/g;

/** "6,00" → "6" · "1.250,50" → "1250.5" · "2.5" → "2.5" · "007" → "7". Returns null when it isn't a number. */
export function canonicalNumber(raw: string): string | null {
  let s = raw.trim();
  if (!/^\d[\d.,]*$/.test(s)) return null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return String(n);
}

export type NumberHit = { raw: string; value: string; index: number };

export function numbersIn(text: string): NumberHit[] {
  const out: NumberHit[] = [];
  for (const m of text.matchAll(NUMBER)) {
    // A trailing sentence dot is not a decimal: "in 2024." is 2024.
    const value = canonicalNumber(m[0]);
    if (value !== null) out.push({ raw: m[0], value, index: m.index! });
  }
  return out;
}

/**
 * Numbers that name a place in the source rather than state a rule: "artikel 13", "art. 4.1", "§3",
 * "pagina 5", "p. 6", footnote markers "[1]". They don't need to appear in the quote.
 */
export function isFreeNumber(text: string, hit: NumberHit): boolean {
  const before = text.slice(Math.max(0, hit.index - 12), hit.index).toLowerCase();
  if (/(artikel|art\.|§|pagina|blz\.|p\.|punt|lid|hoofdstuk)\s*$/.test(before)) return true;
  if (text[hit.index - 1] === '[' && text[hit.index + hit.raw.length] === ']') return true;
  return false;
}

export function numbersGrounded(statement: string, quotes: string[]): boolean {
  return ungroundedNumbers(statement, quotes).length === 0;
}

/** The statement's numbers that no quote contains (for a readable "onzeker" reason). */
export function ungroundedNumbers(statement: string, quotes: string[]): string[] {
  const available = new Set(quotes.flatMap((q) => numbersIn(q).map((h) => h.value)));
  return numbersIn(statement)
    .filter((h) => !isFreeNumber(statement, h) && !available.has(h.value))
    .map((h) => h.raw);
}
