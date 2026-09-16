/**
 * Quote check. Normalises only what PDF text layers and models vary on (unicode form, quote and dash shapes,
 * markdown asterisks, whitespace, including the spaces a PDF puts inside words: "P er marktdag").
 * Letters and digits are never changed, so a different amount never matches.
 */
export function norm(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[’‘ʼ´]/g, "'")
    .replace(/[–—‑]/g, '-')
    .replace(/[“”«»]/g, '"')
    .replace(/[­​‌‍﻿]/g, '')
    .replace(/\*/g, '')
    .replace(/\s+/g, '');
}

export function quoteInPassage(quote: string, passageText: string): boolean {
  const q = norm(quote);
  return q.length > 0 && norm(passageText).includes(q);
}
