"use client";

import { useEffect, useMemo, useState } from "react";
import { answerClient, ClientError } from "@/lib/client";
import { buildReply } from "@/lib/reply";
import { getApproveBlockers } from "@/lib/review-policy";
import type {
  AnswerResponse,
  ApiError,
  ApproveBlocker,
  Casus,
  Fact,
  NotFound,
  Snapshot,
  UpdateAnswerRequest,
} from "@/lib/types";
import {
  FIXTURE_DEVELOPMENT_NOTICE,
  fixtureAnswerResponse,
} from "@/data/seed/fixture-answer";
import { ApproveBar } from "./ApproveBar";
import { CaseCard } from "./CaseCard";
import { EvidencePanel } from "./EvidencePanel";
import { WebSearchPanel } from "@/components/WebSearchPanel";
import { FallbackPassages } from "./FallbackPassages";
import { FindingList } from "./FindingList";
import type { FindingReviewUpdate } from "./ReviewActions";
import { NotUsedList } from "./NotUsedList";
import { ReplyEditor } from "./ReplyEditor";

const DEFAULT_QUESTION = "Ik wil een vaste standplaats op de markt in Schoten. Hoe dien ik een aanvraag in?";
const loadingMessages = ["Bronnen controleren…", "Passages zoeken…", "Bevindingen opstellen…"];

function cloneFixture(): AnswerResponse {
  return JSON.parse(JSON.stringify(fixtureAnswerResponse)) as AnswerResponse;
}

function localUpdate(data: AnswerResponse, patch: UpdateAnswerRequest): AnswerResponse {
  const answer = data.answer;
  const reviews = new Map((patch.finding_reviews || []).map((review) => [review.finding_id, review]));
  const missing = new Map((patch.not_found_decisions || []).map((item) => [item.subquestion, item.decision]));
  const contentChanged = Boolean(patch.facts || patch.finding_reviews || patch.not_found_decisions);
  return {
    ...data,
    answer: {
      ...answer,
      revision: answer.revision + 1,
      casus: patch.facts ? { ...answer.casus, facts: patch.facts } : answer.casus,
      findings: answer.findings.map((finding) => {
        const review = reviews.get(finding.id);
        return review ? {
          ...finding,
          ...review,
          reviewed_at: new Date().toISOString(),
        } : finding;
      }),
      not_found: answer.not_found.map((item) => (
        missing.has(item.subquestion) ? { ...item, decision: missing.get(item.subquestion) } : item
      )),
      reply_text: patch.reply_text ?? answer.reply_text,
      reply_stale: patch.reply_text !== undefined ? false : contentChanged || answer.reply_stale,
    },
  };
}

type Props = { initialAnswerId?: string };

export function AnalysisWorkspace({ initialAnswerId }: Props) {
  const initialFixtureMode = process.env.NEXT_PUBLIC_USE_FIXTURES === "true";
  const [fixtureMode, setFixtureMode] = useState(initialFixtureMode);
  const [data, setData] = useState<AnswerResponse | null>(initialFixtureMode ? cloneFixture() : null);
  const [question, setQuestion] = useState(initialFixtureMode ? fixtureAnswerResponse.answer.casus.question : DEFAULT_QUESTION);
  const [draftCasus, setDraftCasus] = useState<Casus | null>(initialFixtureMode ? cloneFixture().answer.casus : null);
  const [selectedId, setSelectedId] = useState<string | null>(initialFixtureMode ? fixtureAnswerResponse.answer.findings[0]?.id || null : null);
  const [replyText, setReplyText] = useState(initialFixtureMode ? fixtureAnswerResponse.answer.reply_text : "");
  const [reviewer, setReviewer] = useState("");
  const [loading, setLoading] = useState(Boolean(initialAnswerId && !initialFixtureMode));
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [serverBlockers, setServerBlockers] = useState<ApproveBlocker[]>([]);
  const [fallback, setFallback] = useState<ApiError["fallback"]>(undefined);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => setLoadingStep((step) => Math.min(step + 1, loadingMessages.length - 1)), 3500);
    return () => window.clearInterval(timer);
  }, [loading]);

  const acceptResponse = (response: AnswerResponse, resetReply = false) => {
    setData(response);
    setDraftCasus(response.answer.casus);
    setSelectedId((current) => response.answer.findings.some((finding) => finding.id === current)
      ? current
      : response.answer.findings[0]?.id || null);
    if (resetReply) setReplyText(response.answer.reply_text || buildReply(response));
    setServerBlockers([]);
    setFallback(undefined);
    setError(null);
  };

  const showError = (caught: unknown) => {
    if (caught instanceof ClientError) {
      setError(caught.message);
      setFallback(caught.details?.fallback);
      if (caught.details?.blockers) setServerBlockers(caught.details.blockers);
      return;
    }
    setError(caught instanceof Error ? caught.message : "Er is een onverwachte fout opgetreden.");
  };

  useEffect(() => {
    if (!initialAnswerId || fixtureMode) return;
    let cancelled = false;
    answerClient.get(initialAnswerId)
      .then((response) => {
        if (cancelled) return;
        acceptResponse(response, true);
        setNotice("Nieuwe conceptversie geopend vanuit de historiek.");
      })
      .catch((caught: unknown) => {
        if (!cancelled) showError(caught);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [initialAnswerId, fixtureMode]);

  const analyse = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setLoadingStep(0);
    setError(null);
    setFallback(undefined);
    setNotice(null);
    try {
      if (fixtureMode) {
        const fixture = cloneFixture();
        fixture.answer.casus.question = question.trim();
        acceptResponse(fixture, true);
      } else {
        acceptResponse(await answerClient.create({ question: question.trim() }), true);
      }
    } catch (caught) {
      showError(caught);
    } finally {
      setLoading(false);
    }
  };

  const update = async (patch: Omit<UpdateAnswerRequest, "revision">) => {
    if (!data || data.answer.status === "goedgekeurd") return;
    setLoading(true);
    setError(null);
    setFallback(undefined);
    try {
      const response = fixtureMode
        ? localUpdate(data, { revision: data.answer.revision, ...patch })
        : await answerClient.update(data.answer.id, { revision: data.answer.revision, ...patch });
      acceptResponse(response);
      if (patch.reply_text !== undefined) setReplyText(response.answer.reply_text);
    } catch (caught) {
      showError(caught);
    } finally {
      setLoading(false);
    }
  };

  const rerun = async () => {
    if (!data || !draftCasus || data.answer.status === "goedgekeurd") return;
    setLoading(true);
    setLoadingStep(0);
    setError(null);
    setFallback(undefined);
    try {
      if (fixtureMode) {
        const response = {
          ...data,
          answer: { ...data.answer, casus: draftCasus, revision: data.answer.revision + 1, reply_stale: true },
        };
        acceptResponse(response);
      } else {
        acceptResponse(await answerClient.rerun(data.answer.id, {
          revision: data.answer.revision,
          casus: draftCasus,
        }));
      }
    } catch (caught) {
      showError(caught);
    } finally {
      setLoading(false);
    }
  };

  const setFacts = (facts: Fact[]) => {
    setDraftCasus((casus) => casus ? { ...casus, facts } : casus);
    void update({ facts });
  };

  const review = (findingReview: FindingReviewUpdate) => {
    void update({ finding_reviews: [findingReview] });
  };

  const bulkConfirm = () => {
    if (!data) return;
    const reviewedBy = reviewer.trim() || "Medewerker lokale economie";
    const finding_reviews = data.answer.findings
      .filter((finding) => finding.status === "citaat_gecontroleerd" && finding.review === "open")
      .map((finding) => ({
        finding_id: finding.id,
        review: "bevestigd" as const,
        reviewed_by: reviewedBy,
        bulk: true,
      }));
    if (finding_reviews.length > 0) void update({ finding_reviews });
  };

  const decideMissing = (subquestion: string, decision: NonNullable<NotFound["decision"]>) => {
    void update({ not_found_decisions: [{ subquestion, decision }] });
  };

  const regenerateReply = () => {
    if (!data) return;
    const regenerated = buildReply(data);
    if (replyText.trim() && replyText !== data.answer.reply_text && !window.confirm("Dit overschrijft uw niet-opgeslagen handmatige wijzigingen. Doorgaan?")) return;
    setReplyText(regenerated);
    setNotice("Antwoord opnieuw opgebouwd. Sla deze versie op om ze goedkeuringsklaar te maken.");
  };

  const approve = async () => {
    if (!data || !reviewer.trim()) return;
    setLoading(true);
    setError(null);
    setFallback(undefined);
    try {
      if (fixtureMode) {
        const at = new Date().toISOString();
        const snapshot: Snapshot = {
          taken_at: at,
          revision: data.answer.revision,
          casus: data.answer.casus,
          sources: Object.values(data.sources),
          passages: Object.values(data.passages),
          verdicts: data.answer.verdicts,
          findings: data.answer.findings,
          not_found: data.answer.not_found,
          not_used: data.answer.not_used,
          notes_used: [],
          precedent: data.answer.precedent || null,
          reply_text: replyText,
          approved_by: reviewer.trim(),
          approved_at: at,
          models: data.answer.models,
        };
        acceptResponse({
          ...data,
          answer: { ...data.answer, status: "goedgekeurd", approved_by: reviewer.trim(), approved_at: at, snapshot },
        });
      } else {
        acceptResponse(await answerClient.approve(data.answer.id, {
          revision: data.answer.revision,
          approved_by: reviewer.trim(),
        }));
      }
      setNotice("Deze antwoordversie is goedgekeurd en als onveranderlijke momentopname bewaard.");
    } catch (caught) {
      showError(caught);
    } finally {
      setLoading(false);
    }
  };

  const blockers = useMemo(() => {
    if (!data) return [];
    const local = getApproveBlockers(data.answer);
    const merged = [...local];
    for (const blocker of serverBlockers) {
      if (!merged.some((item) => item.code === blocker.code && item.ref === blocker.ref)) merged.push(blocker);
    }
    return merged;
  }, [data, serverBlockers]);

  const openFixture = () => {
    const fixture = cloneFixture();
    setFixtureMode(true);
    setQuestion(fixture.answer.casus.question);
    setNotice(null);
    acceptResponse(fixture, true);
  };

  const leaveFixture = () => {
    setFixtureMode(false);
    setData(null);
    setDraftCasus(null);
    setSelectedId(null);
    setReplyText("");
    setNotice("Live API-modus actief.");
    setError(null);
    setFallback(undefined);
  };

  return (
    <main className="workspace">
      <section className="intro-row">
        <div>
          <p className="eyebrow">Onderbouwd antwoorden</p>
          <h1>Maak een controleerbaar antwoord</h1>
          <p>Analyseer de vraag, controleer elk citaat en keur één specifieke antwoordversie goed.</p>
        </div>
        {process.env.NODE_ENV !== "production" ? (
          <button type="button" className="button button-quiet" onClick={fixtureMode ? leaveFixture : openFixture}>
            {fixtureMode ? "Naar live API" : "Open ontwikkelfixture"}
          </button>
        ) : null}
      </section>

      <div className="scope-banner">
        <strong>Beperkte bronnenset: {data ? Object.keys(data.sources).length : "beschikbare"} documenten.</strong>
        <span> Niet gevonden betekent: geen bewijs in deze bronnen — niet dat er geen regel bestaat.</span>
      </div>
      {fixtureMode ? <div className="fixture-banner"><strong>Ontwikkelmodus.</strong> {FIXTURE_DEVELOPMENT_NOTICE}</div> : null}
      {notice ? <div className="success-banner" role="status">{notice}</div> : null}
      {error ? (
        <div className="error-banner" role="alert">
          <strong>Actie mislukt.</strong> {error}
          {!fixtureMode && process.env.NODE_ENV !== "production" ? <span> De ontwikkelfixture kan alleen handmatig worden geopend.</span> : null}
        </div>
      ) : null}
      {fallback ? <FallbackPassages fallback={fallback} /> : null}

      <section className="question-panel panel">
        <label htmlFor="question">Vraag van de ondernemer</label>
        <div className="question-row">
          <textarea id="question" rows={3} value={question} onChange={(event) => setQuestion(event.target.value)} disabled={loading} />
          <button type="button" className="button button-primary analyse-button" onClick={analyse} disabled={loading || !question.trim()}>
            {loading ? loadingMessages[loadingStep] : "Analyseer"}
          </button>
        </div>
      </section>

      <WebSearchPanel question={question} />

      {data && draftCasus ? (
        <>
          {data.answer.precedent ? (
            <section className="precedent-banner">
              <strong>Vergelijkbare vraag eerder goedgekeurd door {data.answer.precedent.approved_by}</strong>
              <span> op {new Date(data.answer.precedent.approved_at).toLocaleDateString("nl-BE")}</span>
              <ul>{data.answer.precedent.differences.map((difference) => <li key={difference}>{difference}</li>)}</ul>
            </section>
          ) : null}

          <div className="analysis-grid">
            <CaseCard
              casus={draftCasus}
              disabled={loading || data.answer.status === "goedgekeurd"}
              onCasusChange={setDraftCasus}
              onFactsChange={setFacts}
              onRerun={rerun}
            />
            <FindingList
              answer={data.answer}
              selectedId={selectedId}
              reviewer={reviewer}
              disabled={loading || data.answer.status === "goedgekeurd"}
              onSelect={setSelectedId}
              onReview={review}
              onBulkConfirm={bulkConfirm}
              onNotFoundDecision={decideMissing}
            />
            <EvidencePanel data={data} selectedId={selectedId} />
          </div>

          <NotUsedList data={data} />
          <ReplyEditor
            value={replyText}
            stale={data.answer.reply_stale}
            disabled={loading || data.answer.status === "goedgekeurd"}
            onChange={setReplyText}
            onRegenerate={regenerateReply}
            onSave={() => void update({ reply_text: replyText })}
          />
          <ApproveBar
            approved={data.answer.status === "goedgekeurd"}
            reviewer={reviewer}
            replyText={replyText}
            blockers={blockers}
            disabled={loading}
            onReviewerChange={setReviewer}
            onApprove={approve}
          />
        </>
      ) : (
        <section className="empty-workspace">
          <span className="empty-icon" aria-hidden="true">§</span>
          <h2>Start met de vraag van de ondernemer</h2>
          <p>Bronwijzer toont alleen bevindingen die naar officiële bronpassages verwijzen.</p>
        </section>
      )}
    </main>
  );
}
