import type {
  Answer,
  AnswerResponse,
  Finding,
  Passage,
  Source,
} from './types';

type ReplyContext = {
  answer: Answer;
  sources: Record<string, Source>;
  passages: Record<string, Passage>;
};

type ReplyParagraph = {
  text: string;
  passageIds: string[];
};

function isAnswerResponse(input: AnswerResponse | Answer): input is AnswerResponse {
  return 'answer' in input && 'sources' in input && 'passages' in input;
}

function replyContext(input: AnswerResponse | Answer): ReplyContext {
  if (isAnswerResponse(input)) {
    return input;
  }

  const snapshot = input.snapshot;
  return {
    answer: input,
    sources: Object.fromEntries((snapshot?.sources ?? []).map((source) => [source.id, source])),
    passages: Object.fromEntries((snapshot?.passages ?? []).map((passage) => [passage.id, passage])),
  };
}

function sentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function cleanCondition(quote: string): string {
  let condition = quote.trim().replace(/\s*\(\*\)\s*$/, '').trim();
  if (condition.startsWith('(') && condition.endsWith(')')) {
    condition = condition.slice(1, -1).trim();
  }
  return condition.replace(/[.:;]+$/, '').trim();
}

function conditionState(answer: Answer, finding: Finding): 'ja' | 'nee' | 'onbekend' {
  if (!finding.condition) return 'ja';
  return answer.casus.facts.find((fact) => fact.id === finding.condition?.fact_id)?.answer ?? 'onbekend';
}

function chosenFindingText(finding: Finding): ReplyParagraph | null {
  if (finding.review === 'open' || finding.review === 'verworpen') return null;

  if (finding.status === 'tegenstrijdig' || finding.conflict_with) {
    if (!finding.conflict_decision || finding.conflict_decision === 'weglaten') return null;

    if (finding.conflict_decision === 'onzeker_vermelden') {
      return {
        text: 'Hierover bestaan verschillende bronnen; dit wordt nog nagekeken.',
        passageIds: [
          ...finding.citations.map((citation) => citation.passage_id),
          ...(finding.conflict_with ? [finding.conflict_with.passage_id] : []),
        ],
      };
    }

    if (finding.conflict_decision === 'andere') {
      const otherText =
        finding.review === 'gecorrigeerd' && finding.corrected_statement?.trim()
          ? finding.corrected_statement
          : finding.conflict_with?.explanation;
      if (!otherText) return null;
      return {
        text: sentence(otherText),
        passageIds: finding.conflict_with ? [finding.conflict_with.passage_id] : [],
      };
    }
  }

  const text =
    finding.review === 'gecorrigeerd' && finding.corrected_statement?.trim()
      ? finding.corrected_statement
      : finding.statement;

  return {
    text: sentence(text),
    passageIds: finding.citations.map((citation) => citation.passage_id),
  };
}

function withCondition(answer: Answer, finding: Finding, paragraph: ReplyParagraph): ReplyParagraph | null {
  if (!finding.condition) return paragraph;

  const state = conditionState(answer, finding);
  if (state === 'nee') return null;

  const condition = cleanCondition(finding.condition.quote);
  if (!condition) return paragraph;

  if (state === 'onbekend') {
    return { ...paragraph, text: `Indien ${condition}: ${paragraph.text}` };
  }

  return { ...paragraph, text: `${paragraph.text} Voorwaarde: ${sentence(condition)}` };
}

function pageLabel(passage: Passage): string {
  return passage.page_from === passage.page_to
    ? `p. ${passage.page_from}`
    : `p. ${passage.page_from}–${passage.page_to}`;
}

/**
 * Builds a deterministic reply from reviewed findings only.
 *
 * Pass an `AnswerResponse` for complete source footnotes. An approved `Answer`
 * can be passed directly because its frozen snapshot contains the same source
 * and passage metadata. A draft `Answer` without maps remains traceable using
 * passage ids, but callers should normally retain the full API response.
 */
export function buildReply(input: AnswerResponse | Answer): string {
  const { answer, sources, passages } = replyContext(input);
  const paragraphs: ReplyParagraph[] = [];

  for (const finding of answer.findings) {
    const selected = chosenFindingText(finding);
    if (!selected) continue;
    const conditioned = withCondition(answer, finding, selected);
    if (conditioned) paragraphs.push(conditioned);
  }

  for (const missing of answer.not_found) {
    if (missing.decision === 'vermelden') {
      paragraphs.push({
        text: `Over ${missing.subquestion} vonden we in onze bronnen geen informatie.`,
        passageIds: [],
      });
    }
  }

  const footnoteNumber = new Map<string, number>();
  const numberedParagraphs = paragraphs.map((paragraph) => {
    const uniqueIds = [...new Set(paragraph.passageIds)];
    const references = uniqueIds.map((passageId) => {
      if (!footnoteNumber.has(passageId)) {
        footnoteNumber.set(passageId, footnoteNumber.size + 1);
      }
      return `[${footnoteNumber.get(passageId)}]`;
    });
    return references.length > 0 ? `${paragraph.text} ${references.join('')}` : paragraph.text;
  });

  if (footnoteNumber.size === 0) return numberedParagraphs.join('\n\n');

  const footnotes = [...footnoteNumber.entries()]
    .sort((left, right) => left[1] - right[1])
    .map(([passageId, number]) => {
      const passage = passages[passageId];
      if (!passage) return `[${number}] Bronpassage ${passageId}`;

      const source = sources[passage.source_id];
      const title = source?.short_title ?? `Bron ${passage.source_id}`;
      const article = passage.article?.trim();
      return `[${number}] ${title}${article ? `, ${article}` : ''}, ${pageLabel(passage)}`;
    });

  return [...numberedParagraphs, `Bronnen:\n${footnotes.join('\n')}`].join('\n\n');
}
