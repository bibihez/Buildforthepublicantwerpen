import { describe, expect, it } from 'vitest';
import seed from '../data/seed/sources.json';
import config from '../config/schoten.json';
import type { Casus, Source } from '../lib/types';
import { verdict } from '../lib/verdict';

const sources: Source[] = (seed as (Omit<Source, 'added_at' | 'added_by'> & { seed: boolean })[]).map(({ seed: _s, ...s }) => ({
  ...s,
  added_at: '2026-09-16T12:00:00Z',
  added_by: 'seed',
}));
const src = (id: string) => sources.find((s) => s.id === id)!;
const casus = (date: string): Casus => ({
  question: 'Vaste standplaats op de markt?',
  municipality: 'Schoten',
  date,
  activity: 'vaste marktkramer',
  subquestions: [],
  facts: [],
});
const check = (id: string, date = '2026-09-16') => verdict(src(id), casus(date), config, { sources });

describe('verdict', () => {
  it('market regulation today → gecontroleerd', () => {
    expect(check('markt-2024').verdict).toBe('gecontroleerd');
  });

  it('fee regulation before it takes effect → niet_gebruikt', () => {
    const v = check('retributie-markt', '2025-06-01');
    expect(v.verdict).toBe('niet_gebruikt');
    expect(v.reasons.join(' ')).toContain('Nog niet van kracht');
  });

  it('provincial innovation fund passes the territory check for Schoten', () => {
    const v = check('innovatiefonds');
    expect(v.verdict).not.toBe('niet_gebruikt');
    expect(v.reasons.join(' ')).not.toContain('Ander grondgebied');
  });

  it('royal decree 2006 → niet_gebruikt, historisch', () => {
    const v = check('hist-kb-2006');
    expect(v.verdict).toBe('niet_gebruikt');
    expect(v.reasons.join(' ')).toContain('Historisch');
  });

  it('terrace rules without dates → onzeker', () => {
    const v = check('terrassen');
    expect(v.verdict).toBe('onzeker');
    expect(v.reasons).toContain('Geen datum van inwerkingtreding');
  });

  it('VLAIO guidance → gecontroleerd with the Richtlijn reason, no date check', () => {
    const v = check('vlaio-eigen-zaak', '1990-01-01');
    expect(v.verdict).toBe('gecontroleerd');
    expect(v.reasons.some((r) => r.startsWith('Richtlijn, gepubliceerd januari 2026'))).toBe(true);
    expect(v.reasons.join(' ')).not.toMatch(/van kracht/);
  });

  it('old market regulation → niet_gebruikt, vervangen', () => {
    const v = check('markt-oud');
    expect(v.verdict).toBe('niet_gebruikt');
    expect(v.reasons).toContain('Vervangen door Marktreglement Schoten 2024');
  });

  it('deactivated source names who and why', () => {
    const s = { ...src('markt-2024'), active: false };
    const v = verdict(s, casus('2026-09-16'), config, {
      events: [{ id: 'e1', source_id: 'markt-2024', at: '2026-09-16T13:00:00Z', by: 'Marleen', type: 'gedeactiveerd', reason: 'fout bestand' }],
    });
    expect(v.verdict).toBe('niet_gebruikt');
    expect(v.reasons).toContain('Gedeactiveerd door Marleen: fout bestand');
  });

  it('other territory → niet_gebruikt', () => {
    const v = verdict({ ...src('markt-2024'), territory: 'Brasschaat' }, casus('2026-09-16'), config);
    expect(v.reasons).toContain('Ander grondgebied: Brasschaat');
  });
});
