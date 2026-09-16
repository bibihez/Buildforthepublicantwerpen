import { norm } from "./anchor";

export type QuoteTextRange = {
  startItem: number;
  startOffset: number;
  endItem: number;
  endOffset: number;
};

type TextPoint = { item: number; offset: number };

function normalizedCharacter(value: string): string {
  return norm(value);
}

/** Maps a normalized quote match back to PDF.js text-item offsets. */
export function findQuoteTextRange(items: string[], quote: string): QuoteTextRange | null {
  const characters: string[] = [];
  const points: TextPoint[] = [];

  items.forEach((item, itemIndex) => {
    for (let offset = 0; offset < item.length; offset += 1) {
      const normalized = normalizedCharacter(item[offset]);
      for (const character of normalized) {
        characters.push(character);
        points.push({ item: itemIndex, offset });
      }
    }
  });

  const target = norm(quote);
  if (!target) return null;
  const start = characters.join("").indexOf(target);
  if (start < 0) return null;
  const end = start + target.length - 1;
  const first = points[start];
  const last = points[end];
  if (!first || !last) return null;

  return {
    startItem: first.item,
    startOffset: first.offset,
    endItem: last.item,
    endOffset: last.offset + 1,
  };
}
