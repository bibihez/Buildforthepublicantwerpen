"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type {
  AnswerResponse,
  ApiError,
  Finding,
  Snapshot,
} from "@/lib/types";
import styles from "@/app/historiek/history.module.css";

type DetailState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; response: AnswerResponse };

type ActionState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "error"; message: string; blockers: string[] }
  | { status: "success"; answerId: string };

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Brussels",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeZone: "Europe/Brussels",
});

function formatDate(value: string, includeTime = true) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return includeTime
    ? dateFormatter.format(date)
    : shortDateFormatter.format(date);
}

function reviewLabel(review: Finding["review"]) {
  switch (review) {
    case "bevestigd":
      return "Confirmed by officer";
    case "gecorrigeerd":
      return "Corrected";
    case "verworpen":
      return "Rejected";
    default:
      return "Open";
  }
}

function statusLabel(status: Finding["status"]) {
  switch (status) {
    case "citaat_gecontroleerd":
      return "Quote verified";
    case "tegenstrijdig":
      return "Conflicting passages";
    default:
      return "Uncertain";
  }
}

function factLabel(answer: Snapshot["casus"]["facts"][number]["answer"]) {
  return answer === "ja" ? "Yes" : answer === "nee" ? "No" : "Unknown";
}

function decisionLabel(decision: Finding["conflict_decision"]) {
  switch (decision) {
    case "deze":
      return "This passage selected";
    case "andere":
      return "Other passage selected";
    case "onzeker_vermelden":
      return "Reported as uncertain";
    case "weglaten":
      return "Omitted";
    default:
      return "No decision saved";
  }
}

function levelLabel(level: Snapshot["sources"][number]["level"]) {
  switch (level) {
    case "federaal":
      return "Federal";
    case "vlaams":
      return "Flemish";
    case "provinciaal":
      return "Provincial";
    case "gemeentelijk":
      return "Municipal";
  }
}

function natureLabel(nature: Snapshot["sources"][number]["nature"]) {
  return nature === "wetgeving" ? "Legislation" : "Guidance";
}

function verdictLabel(
  verdict: Snapshot["verdicts"][number]["verdict"] | undefined,
) {
  switch (verdict) {
    case "gecontroleerd":
      return "Source checks passed";
    case "onzeker":
      return "Uncertain";
    case "niet_gebruikt":
      return "Not used";
    default:
      return "Not saved";
  }
}

async function readApiError(response: Response) {
  const fallback = `The request failed (${response.status}).`;

  try {
    const body = (await response.json()) as Partial<ApiError>;
    return {
      message: body.error || fallback,
      blockers: body.blockers?.map((blocker) => blocker.message) ?? [],
    };
  } catch {
    return { message: fallback, blockers: [] };
  }
}

export function HistoryDetail({ answerId }: { answerId: string }) {
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [action, setAction] = useState<ActionState>({ status: "idle" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnswer() {
      try {
        const response = await fetch(
          `/api/answers/${encodeURIComponent(answerId)}`,
          { cache: "no-store", signal: controller.signal },
        );

        if (!response.ok) {
          const apiError = await readApiError(response);
          throw new Error(apiError.message);
        }

        const data = (await response.json()) as AnswerResponse;
        if (!data?.answer?.id) {
          throw new Error("The server returned invalid answer data.");
        }
        setState({ status: "ready", response: data });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "The answer could not be loaded.",
        });
      }
    }

    void loadAnswer();
    return () => controller.abort();
  }, [answerId]);

  const snapshot =
    state.status === "ready" && state.response.answer.status === "goedgekeurd"
      ? state.response.answer.snapshot ?? null
      : null;

  const sourceById = useMemo(
    () => new Map(snapshot?.sources.map((source) => [source.id, source]) ?? []),
    [snapshot],
  );
  const passageById = useMemo(
    () =>
      new Map(snapshot?.passages.map((passage) => [passage.id, passage]) ?? []),
    [snapshot],
  );
  const verdictBySource = useMemo(
    () =>
      new Map(
        snapshot?.verdicts.map((verdict) => [verdict.source_id, verdict]) ?? [],
      ),
    [snapshot],
  );

  async function createNewVersion() {
    setAction({ status: "saving" });

    try {
      const response = await fetch(
        `/api/answers/${encodeURIComponent(answerId)}/new-version`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      if (!response.ok) {
        const error = await readApiError(response);
        setAction({ status: "error", ...error });
        return;
      }

      const data = (await response.json()) as AnswerResponse;
      if (!data?.answer?.id) {
        throw new Error("The server returned an invalid new version.");
      }
      setAction({ status: "success", answerId: data.answer.id });
    } catch (error) {
      setAction({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "The new version could not be created.",
        blockers: [],
      });
    }
  }

  if (state.status === "loading") {
    return (
      <main className={styles.page}>
        <div className={styles.stateBox} role="status">
          <strong>Loading snapshot…</strong>
          Retrieving the approved answer.
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className={styles.page}>
        <div className={`${styles.stateBox} ${styles.errorBox}`} role="alert">
          <strong>Answer unavailable</strong>
          {state.message}
        </div>
        <div className={styles.actionRow}>
          <Link className={styles.secondaryLink} href="/historiek">
            Back to answer history
          </Link>
        </div>
      </main>
    );
  }

  if (!snapshot) {
    const isDraft = state.response.answer.status === "concept";
    return (
      <main className={styles.page}>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Answer history</p>
            <h1>{isDraft ? "Draft version" : "No snapshot"}</h1>
          </div>
          <Link className={styles.secondaryLink} href="/historiek">
            Back to answer history
          </Link>
        </header>
        <div className={`${styles.stateBox} ${styles.warningBox}`} role="status">
          <strong>
            {isDraft
              ? "This version has not yet been approved."
              : "The approved snapshot is missing."}
          </strong>
          {isDraft
            ? "Answer history only shows the saved content of approved versions. Open the draft in the workspace to continue."
            : "Current answer data is deliberately not shown as a substitute. This keeps the history auditable."}
        </div>
        {isDraft ? (
          <div className={styles.actionRow}>
            <p className={styles.actionInfo}>
              Draft {state.response.answer.id}, revision {state.response.answer.revision}
            </p>
            <Link
              className={styles.primaryLink}
              href={`/?answer=${encodeURIComponent(state.response.answer.id)}`}
            >
              Open draft in workspace
            </Link>
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.detailHeader}>
        <div className={styles.headerTopline}>
          <div>
            <p className={styles.eyebrow}>Approved answer</p>
            <h1>{snapshot.casus.question}</h1>
          </div>
          <Link className={styles.secondaryLink} href="/historiek">
            Back to answer history
          </Link>
        </div>
        <p className={styles.snapshotNotice}>
          This is the immutable snapshot of revision {snapshot.revision}, saved
          at approval. Current source data is not used here.
        </p>
        <dl className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <dt>Approved by</dt>
            <dd>{snapshot.approved_by}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt>Approved on</dt>
            <dd>{formatDate(snapshot.approved_at)}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt>Snapshot taken</dt>
            <dd>{formatDate(snapshot.taken_at)}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt>Version</dt>
            <dd>Revision {snapshot.revision}</dd>
          </div>
        </dl>
      </header>

      <section className={styles.section}>
        <h2>Case</h2>
        <dl className={styles.caseGrid}>
          <div className={styles.caseItem}>
            <dt>Municipality</dt>
            <dd>{snapshot.casus.municipality}</dd>
          </div>
          <div className={styles.caseItem}>
            <dt>Case date</dt>
            <dd>{formatDate(snapshot.casus.date, false)}</dd>
          </div>
          <div className={styles.caseItem}>
            <dt>Activity</dt>
            <dd>{snapshot.casus.activity || "Not provided"}</dd>
          </div>
        </dl>

        {snapshot.casus.facts.length > 0 ? (
          <ul className={styles.factList} aria-label="Case facts">
            {snapshot.casus.facts.map((fact) => (
              <li key={fact.id}>
                <span>{fact.question}</span>
                <span className={styles.valueLabel}>{factLabel(fact.answer)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className={styles.section}>
        <h2>Findings and review</h2>
        <p className={styles.sectionLead}>
          The statements, quotes and reviews below come exclusively from the
          approved snapshot.
        </p>
        {snapshot.findings.length === 0 ? (
          <p>No findings were saved in this version.</p>
        ) : (
          <ol className={styles.findingList}>
            {snapshot.findings.map((finding) => (
              <li className={styles.findingCard} key={finding.id}>
                <div className={styles.findingMain}>
                  <div className={styles.findingTopline}>
                    <div>
                      <p className={styles.subquestion}>{finding.subquestion}</p>
                      <p className={styles.statement}>
                        {finding.review === "gecorrigeerd"
                          ? finding.corrected_statement || finding.statement
                          : finding.statement}
                      </p>
                    </div>
                    <span
                      className={`${styles.reviewBadge} ${
                        finding.review === "open" ? styles.reviewOpen : ""
                      } ${
                        finding.review === "verworpen"
                          ? styles.reviewRejected
                          : ""
                      }`}
                    >
                      {reviewLabel(finding.review)}
                    </span>
                  </div>

                  {finding.review === "gecorrigeerd" ? (
                    <p className={styles.originalStatement}>
                      Original finding: {finding.statement}
                    </p>
                  ) : null}

                  <p className={styles.detailLine}>
                    Automated status: {statusLabel(finding.status)}
                    {finding.bulk ? " · confirmed in bulk" : ""}
                  </p>

                  {finding.status_reasons.length > 0 ? (
                    <ul className={styles.reasonList}>
                      {finding.status_reasons.map((reason, index) => (
                        <li key={`${finding.id}-status-${index}`}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}

                  {finding.condition ? (
                    <p className={styles.detailLine}>
                      <strong>Condition:</strong> {finding.condition.quote}
                      {!finding.condition.quote_checked
                        ? " — text not confirmed by quote verification"
                        : ""}
                    </p>
                  ) : null}

                  {finding.review_reason ? (
                    <p className={styles.detailLine}>
                      <strong>Review reason:</strong> {finding.review_reason}
                    </p>
                  ) : null}

                  {finding.reviewed_by || finding.reviewed_at ? (
                    <p className={styles.detailLine}>
                      Reviewed by {finding.reviewed_by || "unknown"}
                      {finding.reviewed_at
                        ? ` on ${formatDate(finding.reviewed_at)}`
                        : ""}
                    </p>
                  ) : null}

                  {finding.status === "tegenstrijdig" ? (
                    <p className={styles.detailLine}>
                      <strong>Conflict decision:</strong>{" "}
                      {decisionLabel(finding.conflict_decision)}
                      {finding.conflict_reason
                        ? ` — ${finding.conflict_reason}`
                        : ""}
                    </p>
                  ) : null}
                </div>

                {finding.citations.length > 0 ? (
                  <ul className={styles.citationList} aria-label="Quotes">
                    {finding.citations.map((citation, index) => {
                      const passage = passageById.get(citation.passage_id);
                      const source = passage
                        ? sourceById.get(passage.source_id)
                        : undefined;
                      return (
                        <li
                          className={styles.citation}
                          key={`${citation.passage_id}-${index}`}
                        >
                          <h3>{source?.short_title || "Source in snapshot"}</h3>
                          <p className={styles.sourceMeta}>
                            {passage?.article || "No article specified"}
                            {passage
                              ? ` · p. ${passage.page_from}${
                                  passage.page_to !== passage.page_from
                                    ? `–${passage.page_to}`
                                    : ""
                                }`
                              : ""}
                          </p>
                          <blockquote className={styles.quote}>
                            “{citation.quote}”
                          </blockquote>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {snapshot.not_found.length > 0 ? (
        <section className={styles.section}>
          <h2>Not found in the available sources</h2>
          <ul className={styles.missingList}>
            {snapshot.not_found.map((item) => (
              <li key={item.subquestion}>
                <span>{item.subquestion}</span>
                <span className={styles.valueLabel}>
                  {item.decision === "vermelden"
                    ? "Included"
                    : item.decision === "weglaten"
                      ? "Omitted"
                      : "No decision"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.section}>
        <h2>Source versions</h2>
        <p className={styles.sectionLead}>
          Saved versions and source checks at the time of approval.
        </p>
        {snapshot.sources.length === 0 ? (
          <p>No source versions were saved.</p>
        ) : (
          <div className={styles.sourceGrid}>
            {snapshot.sources.map((source) => {
              const verdict = verdictBySource.get(source.id);
              return (
                <article className={styles.sourceCard} key={source.id}>
                  <div className={styles.cardTopline}>
                    <h3>{source.title}</h3>
                    <span className={styles.hash}>
                      {source.sha256 ? source.sha256.slice(0, 8) : "no hash"}
                    </span>
                  </div>
                  <p className={styles.sourceMeta}>
                    {source.short_title} · {levelLabel(source.level)} ·{" "}
                    {natureLabel(source.nature)} · {source.territory}
                  </p>
                  <p className={styles.detailLine}>
                    Source check: {verdictLabel(verdict?.verdict)}
                  </p>
                  {verdict?.reasons.length ? (
                    <ul className={styles.reasonList}>
                      {verdict.reasons.map((reason, index) => (
                        <li key={`${source.id}-reason-${index}`}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2>Approved answer</h2>
        <pre className={styles.reply}>{snapshot.reply_text || "No answer text was saved."}</pre>
      </section>

      {action.status === "error" ? (
        <div className={`${styles.inlineMessage} ${styles.errorBox}`} role="alert">
          <strong>New version not created</strong>
          {action.message}
          {action.blockers.length > 0 ? (
            <ul className={styles.errorList}>
              {action.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {action.status === "success" ? (
        <div className={`${styles.inlineMessage} ${styles.successBox}`} role="status">
          <strong>New draft version created</strong>
          The approved version remains unchanged. The new draft can now be
          reviewed in the workspace.
        </div>
      ) : null}

      <div className={styles.actionRow}>
        <p className={styles.actionInfo}>
          Previous answers provide context, not evidence. A new version never
          reuses approved text automatically.
        </p>
        {action.status === "success" ? (
          <Link
            className={styles.primaryLink}
            href={`/?answer=${encodeURIComponent(action.answerId)}`}
          >
            Open new draft version
          </Link>
        ) : (
          <button
            className={styles.actionButton}
            disabled={action.status === "saving"}
            onClick={() => void createNewVersion()}
            type="button"
          >
            {action.status === "saving"
              ? "Creating new version…"
              : "Create new version"}
          </button>
        )}
      </div>
    </main>
  );
}
