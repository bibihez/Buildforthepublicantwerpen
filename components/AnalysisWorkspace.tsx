"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle, Files, Sparkle } from "@phosphor-icons/react";
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
import { AnalysisTrace } from "./AnalysisTrace";
import { CaseCard } from "./CaseCard";
import { EvidencePanel } from "./EvidencePanel";
import { NotesPanel } from "@/components/NotesPanel";
import { WebSearchPanel } from "@/components/WebSearchPanel";
import { FallbackPassages } from "./FallbackPassages";
import { FindingList } from "./FindingList";
import type { FindingReviewUpdate } from "./ReviewActions";
import { NotUsedList } from "./NotUsedList";
import { ReplyEditor } from "./ReplyEditor";

const DEFAULT_QUESTION = "I want a permanent pitch at the market in Schoten. How do I apply?";
const loadingMessages = ["Checking sources…", "Searching passages…", "Preparing findings…"];
const suggestedQuestions = [
  "How do I apply for a fixed market pitch in Schoten?",
  "Which permits do I need for a food truck?",
  "What are the rules for a terrace?",
  "Which documents are required for a retail activity?",
];

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
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [webSearchRun, setWebSearchRun] = useState(initialFixtureMode ? 1 : 0);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [serverBlockers, setServerBlockers] = useState<ApproveBlocker[]>([]);
  const [fallback, setFallback] = useState<ApiError["fallback"]>(undefined);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!analysisRunning) return;
    const timer = window.setInterval(() => setLoadingStep((step) => Math.min(step + 1, loadingMessages.length - 1)), 3500);
    return () => window.clearInterval(timer);
  }, [analysisRunning]);

  const acceptResponse = (response: AnswerResponse, resetReply = false, refreshWebSearch = false) => {
    setData(response);
    setQuestion(response.answer.casus.question);
    setDraftCasus(response.answer.casus);
    setSelectedId((current) => response.answer.findings.some((finding) => finding.id === current)
      ? current
      : response.answer.findings[0]?.id || null);
    if (resetReply) setReplyText(response.answer.reply_text || buildReply(response));
    if (refreshWebSearch) setWebSearchRun((current) => current + 1);
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
    setError(caught instanceof Error ? caught.message : "An unexpected error occurred.");
  };

  useEffect(() => {
    if (!initialAnswerId || fixtureMode) return;
    let cancelled = false;
    answerClient.get(initialAnswerId)
      .then((response) => {
        if (cancelled) return;
        acceptResponse(response, true, true);
        setNotice("New draft version opened from history.");
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
    setAnalysisRunning(true);
    setLoadingStep(0);
    setError(null);
    setFallback(undefined);
    setNotice(null);
    try {
      if (fixtureMode) {
        const fixture = cloneFixture();
        fixture.answer.casus.question = question.trim();
        acceptResponse(fixture, true, true);
      } else {
        acceptResponse(await answerClient.create({ question: question.trim() }), true, true);
      }
    } catch (caught) {
      showError(caught);
    } finally {
      setAnalysisRunning(false);
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
    setAnalysisRunning(true);
    setLoadingStep(0);
    setError(null);
    setFallback(undefined);
    try {
      if (fixtureMode) {
        const response = {
          ...data,
          answer: { ...data.answer, casus: draftCasus, revision: data.answer.revision + 1, reply_stale: true },
        };
        acceptResponse(response, false, true);
      } else {
        acceptResponse(await answerClient.rerun(data.answer.id, {
          revision: data.answer.revision,
          casus: draftCasus,
        }), false, true);
      }
    } catch (caught) {
      showError(caught);
    } finally {
      setAnalysisRunning(false);
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
    const reviewedBy = reviewer.trim() || "Local economy officer";
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
    if (replyText.trim() && replyText !== data.answer.reply_text && !window.confirm("This will overwrite your unsaved manual changes. Continue?")) return;
    setReplyText(regenerated);
    setNotice("Reply rebuilt. Save this version to make it ready for approval.");
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
      setNotice("This answer version was approved and saved as an immutable snapshot.");
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
    acceptResponse(fixture, true, true);
  };

  const leaveFixture = () => {
    setFixtureMode(false);
    setData(null);
    setDraftCasus(null);
    setSelectedId(null);
    setReplyText("");
    setNotice("Live API mode active.");
    setError(null);
    setFallback(undefined);
  };

  return (
    <main className="workspace workbench">
      <aside className="workbench-rail" aria-label="Question context">
        <NotesPanel
          question={question.trim() || undefined}
          defaultTopic={draftCasus?.activity ?? data?.answer.casus.activity ?? ""}
          author={reviewer}
        />

        <section className="panel source-ready-card">
          <span className="context-icon" aria-hidden="true"><Files weight="duotone" /></span>
          <div>
            <strong>{data ? `${Object.keys(data.sources).length} source documents checked` : "Official source library ready"}</strong>
            <p>Bronwijzer searches uploaded regulations and guidance after you analyse the question.</p>
          </div>
        </section>

        <section className="trust-card">
          <CheckCircle aria-hidden="true" weight="fill" />
          <div>
            <strong>Trusted information, in your hands</strong>
            <p>Every finding links to an exact source quote. You remain responsible for the final answer.</p>
          </div>
        </section>
      </aside>

      <div className="workbench-main">
        <section className="assistant-intro">
          <span className="assistant-mark" aria-hidden="true"><Sparkle weight="fill" /></span>
          <p className="assistant-kicker">Evidence assistant for local economy</p>
          <h1>What can I help you verify today?</h1>
          <p>Ask about permits, regulations or procedures. Bronwijzer will trace the answer back to official sources.</p>
          <div className="suggested-questions" aria-label="Suggested questions">
            {suggestedQuestions.map((suggestion) => (
              <button type="button" onClick={() => setQuestion(suggestion)} disabled={loading} key={suggestion}>
                {suggestion}
              </button>
            ))}
          </div>
          {process.env.NODE_ENV !== "production" ? (
            <button type="button" className="button button-quiet fixture-trigger" onClick={fixtureMode ? leaveFixture : openFixture}>
              {fixtureMode ? "Use live API" : "Open development fixture"}
            </button>
          ) : null}
        </section>

      <div className="scope-banner">
        <strong>Limited source set: {data ? Object.keys(data.sources).length : "available"} documents.</strong>
        <span> Not found means there is no evidence in these sources. It does not mean that no rule exists.</span>
      </div>
      {fixtureMode ? <div className="fixture-banner"><strong>Development mode.</strong> {FIXTURE_DEVELOPMENT_NOTICE}</div> : null}
      {notice ? <div className="success-banner" role="status">{notice}</div> : null}
      {error ? (
        <div className="error-banner" role="alert">
          <strong>Action failed.</strong> {error}
          {!fixtureMode && process.env.NODE_ENV !== "production" ? <span> The development fixture can only be opened manually.</span> : null}
        </div>
      ) : null}
      {fallback ? <FallbackPassages fallback={fallback} /> : null}

      <section className="question-panel panel">
        <label htmlFor="question">Ask Bronwijzer</label>
        <div className="question-row">
          <textarea
            id="question"
            rows={3}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={loading}
            placeholder="Ask a question about a permit, regulation or procedure"
          />
          <button type="button" className="button button-primary analyse-button" onClick={analyse} disabled={loading || !question.trim()}>
            <span>{analysisRunning ? loadingMessages[loadingStep] : loading ? "Working…" : "Analyse"}</span>
            {!loading ? <ArrowRight aria-hidden="true" weight="bold" /> : null}
          </button>
        </div>
      </section>

      <AnalysisTrace question={question} running={analysisRunning} activeStep={loadingStep} data={data} />

      {data ? (
        <WebSearchPanel
          question={data.answer.casus.question}
          runKey={`${data.answer.id}:${webSearchRun}`}
        />
      ) : null}

      {data && draftCasus ? (
        <>
          {data.answer.precedent ? (
            <section className="precedent-banner">
              <strong>Similar question previously approved by {data.answer.precedent.approved_by}</strong>
              <span> on {new Date(data.answer.precedent.approved_at).toLocaleDateString("en-GB")}</span>
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
      ) : null}
      </div>
    </main>
  );
}
