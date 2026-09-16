import type { Casus, Source, SourceEvent, SourceVerdict } from './types';

export type ScopeConfig = { municipality: string; scope: string[] };

/** Optional lookups so reasons can name things; the checks themselves only read `source`, `casus` and `config`. */
export type VerdictContext = {
  sources?: Pick<Source, 'id' | 'short_title'>[];
  events?: SourceEvent[];
};

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

/** "2024-04-01" → "1 april 2024" · "2026-01" → "januari 2026" · "2022" → "2022". Anything else is shown as-is. */
export function formatDate(iso: string): string {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(iso.trim());
  if (!m) return iso;
  const [, y, mo, d] = m;
  if (!mo) return y;
  const month = MONTHS[Number(mo) - 1] ?? mo;
  return d ? `${Number(d)} ${month} ${y}` : `${month} ${y}`;
}

function dayAfter(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

/** Compare ISO dates of possibly different precision: "2026-01" starts on 2026-01-01, ends on 2026-01-31. */
function startOf(iso: string): string {
  return iso.length === 4 ? `${iso}-01-01` : iso.length === 7 ? `${iso}-01` : iso;
}
function endOf(iso: string): string {
  return iso.length === 4 ? `${iso}-12-31` : iso.length === 7 ? `${iso}-31` : iso;
}

/**
 * Source checks. Pure. Checks what code can check (active, superseded, status, territory, validity dates)
 * and never whether the rule legally applies to the case. `gecontroleerd` = "Broncontrole geslaagd".
 */
export function verdict(source: Source, casus: Casus, config: ScopeConfig, ctx: VerdictContext = {}): SourceVerdict {
  const fails: string[] = [];
  const unknowns: string[] = [];
  const notes: string[] = [];

  // 1 · active
  if (!source.active) {
    const ev = [...(ctx.events ?? [])]
      .filter((e) => e.source_id === source.id && e.type === 'gedeactiveerd')
      .sort((a, b) => a.at.localeCompare(b.at))
      .pop();
    fails.push(ev ? `Gedeactiveerd door ${ev.by}: ${ev.reason ?? 'geen reden opgegeven'}` : 'Gedeactiveerd');
  }

  // 2 · superseded
  if (source.superseded_by) {
    const next = ctx.sources?.find((s) => s.id === source.superseded_by);
    fails.push(`Vervangen door ${next?.short_title ?? source.superseded_by}`);
  }

  // 3 · status
  if (source.status === 'historisch') fails.push('Historisch document — achtergrond, geen huidige regel');
  else if (source.status === 'onbekend') unknowns.push('Status van het document onbekend');

  // 4 · territory (topic is not territory: a provincial document passes for Schoten)
  if (!source.territory?.trim()) unknowns.push('Grondgebied onbekend');
  else if (!config.scope.includes(source.territory)) fails.push(`Ander grondgebied: ${source.territory}`);

  // 5 · validity dates, legislation only. Guidance publication date is shown, never used as validity.
  if (source.nature === 'wetgeving') {
    const date = casus.date;
    if (!source.effective_from) {
      unknowns.push('Geen datum van inwerkingtreding');
    } else if (date < startOf(source.effective_from)) {
      fails.push(`Nog niet van kracht op ${formatDate(date)} (van kracht vanaf ${formatDate(source.effective_from)})`);
    }
    if (source.effective_until && date > endOf(source.effective_until)) {
      fails.push(`Niet meer van kracht sinds ${formatDate(dayAfter(source.effective_until))}`);
    }
  } else {
    notes.push(
      source.published_on
        ? `Richtlijn, gepubliceerd ${formatDate(source.published_on)} — geen regelgeving`
        : 'Richtlijn, publicatiedatum onbekend — geen regelgeving',
    );
  }

  const result: SourceVerdict['verdict'] = fails.length ? 'niet_gebruikt' : unknowns.length ? 'onzeker' : 'gecontroleerd';
  return { source_id: source.id, verdict: result, reasons: [...fails, ...unknowns, ...notes] };
}

export function verdictsFor(sources: Source[], casus: Casus, config: ScopeConfig, events: SourceEvent[] = []): SourceVerdict[] {
  return sources.map((s) => verdict(s, casus, config, { sources, events }));
}
