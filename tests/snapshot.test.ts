import { describe, expect, it } from 'vitest';
import { getApproveBlockers as approvalBlockers } from '../lib/review-policy';
import { applyUpdate, approve, buildSnapshot, newVersion, RequestError } from '../lib/snapshot';
import type { Answer, Finding, Passage, Source } from '../lib/types';

const finding = (id: string, over: Partial<Finding> = {}): Finding => ({
  id, subquestion: 'Hoe?', statement: `Stelling ${id}`, citations: [{ passage_id: 'p1', quote: 'x' }], condition: null,
  conflict_with: null, status: 'citaat_gecontroleerd', status_reasons: [], review: 'open', ...over,
});
const answer = (): Answer => ({
  id: 'a1', created_at: '2026-09-16T12:00:00Z', revision: 1,
  casus: { question: 'Q', municipality: 'Schoten', date: '2026-09-16', activity: 'markt', subquestions: ['Hoe?', 'Kost?'], facts: [{ id: 'voeding', question: 'Voeding?', answer: 'onbekend', set_by: 'ai' }] },
  verdicts: [{ source_id: 'markt-2024', verdict: 'gecontroleerd', reasons: [] }],
  candidates: ['p1', 'p2'],
  findings: [finding('f1'), finding('f2', { status: 'tegenstrijdig', conflict_with: { passage_id: 'p2', explanation: 'anders' } })],
  not_found: [{ subquestion: 'Kost?', decision: null }],
  not_used: [], reply_text: '', reply_stale: false, status: 'concept', models: { case: 'm1', findings: 'm2' },
});
const NOW = '2026-09-16T13:00:00Z';

describe('approval', () => {
  it('lists every blocker', () => {
    const codes = approvalBlockers(answer(), 1).map((b) => b.code);
    expect(codes).toEqual(['finding_open', 'finding_open', 'conflict_undecided', 'not_found_undecided']);
  });

  it('reviewing everything clears the blockers, except a stale reply', () => {
    const a = applyUpdate(answer(), {
      revision: 1,
      finding_reviews: [
        { finding_id: 'f1', review: 'bevestigd', reviewed_by: 'Marleen', bulk: true },
        { finding_id: 'f2', review: 'bevestigd', reviewed_by: 'Marleen', conflict_decision: 'onzeker_vermelden', conflict_reason: 'nakijken' },
      ],
      not_found_decisions: [{ subquestion: 'Kost?', decision: 'vermelden' }],
    }, NOW);
    expect(a.revision).toBe(2);
    expect(approvalBlockers(a, 2).map((b) => b.code)).toEqual(['reply_stale']);
    const saved = applyUpdate(a, { revision: 2, reply_text: 'Beste,' }, NOW);
    expect(approvalBlockers(saved, 3)).toEqual([]);
    expect(approvalBlockers(saved, 2).map((b) => b.code)).toEqual(['revision_mismatch']);
  });

  it('refuses bulk confirmation of a finding that is not a checked quote', () => {
    expect(() => applyUpdate(answer(), { revision: 1, finding_reviews: [{ finding_id: 'f2', review: 'bevestigd', reviewed_by: 'M', bulk: true }] }, NOW)).toThrow(RequestError);
  });

  it('a rejection needs a reason, a correction needs text', () => {
    expect(() => applyUpdate(answer(), { revision: 1, finding_reviews: [{ finding_id: 'f1', review: 'verworpen', reviewed_by: 'M' }] }, NOW)).toThrow('reden');
    expect(() => applyUpdate(answer(), { revision: 1, finding_reviews: [{ finding_id: 'f1', review: 'gecorrigeerd', reviewed_by: 'M' }] }, NOW)).toThrow('tekst');
  });

  it('approval freezes a snapshot; any later change is refused; a new version is a draft again', () => {
    const sources = [{ id: 'markt-2024', short_title: 'Markt', sha256: 'abc' } as Source, { id: 'other' } as Source];
    const passages: Passage[] = [
      { id: 'p1', source_id: 'markt-2024', page_from: 5, page_to: 6, article: 'Artikel 13', text: 'x' },
      { id: 'p9', source_id: 'markt-2024', page_from: 1, page_to: 1, article: null, text: 'niet geciteerd' },
    ];
    const a = { ...answer(), findings: [finding('f1', { review: 'bevestigd' })], not_found: [], reply_text: 'Beste,' };
    const approved = approve(a, buildSnapshot(a, sources, passages, 'Marleen', NOW));
    expect(approved.status).toBe('goedgekeurd');
    expect(approved.snapshot?.sources.map((s) => s.id)).toEqual(['markt-2024']);
    expect(approved.snapshot?.passages.map((p) => p.id)).toEqual(['p1']);
    expect(approvalBlockers(approved, approved.revision).map((b) => b.code)).toEqual(['already_approved']);
    expect(() => applyUpdate(approved, { revision: approved.revision, reply_text: 'x' }, NOW)).toThrow('nieuwe versie');

    const draft = newVersion(approved, 'a2', NOW);
    expect(draft).toMatchObject({ id: 'a2', parent_id: 'a1', status: 'concept', revision: 1, snapshot: null, approved_by: null });
    expect(approved.snapshot?.findings[0].review).toBe('bevestigd');
  });
});
