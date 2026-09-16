import type { Answer, Fact, Finding, NotFound } from "@/lib/types";
import { NotFoundBadge, StatusBadge } from "./StatusBadge";
import { ReviewActions, type FindingReviewUpdate } from "./ReviewActions";

type Props = {
  answer: Answer;
  selectedId: string | null;
  reviewer: string;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onReview: (review: FindingReviewUpdate) => void;
  onBulkConfirm: () => void;
  onNotFoundDecision: (subquestion: string, decision: NonNullable<NotFound["decision"]>) => void;
};

function conditionState(finding: Finding, facts: Fact[]) {
  if (!finding.condition) return null;
  const fact = facts.find((item) => item.id === finding.condition?.fact_id);
  return fact?.set_by === "officer" ? fact.answer : "onbekend";
}

export function FindingList({
  answer,
  selectedId,
  reviewer,
  disabled,
  onSelect,
  onReview,
  onBulkConfirm,
  onNotFoundDecision,
}: Props) {
  const bulkCount = answer.findings.filter((finding) => (
    finding.status === "citaat_gecontroleerd" && finding.review === "open"
  )).length;

  return (
    <section className="panel findings-panel" aria-labelledby="findings-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Review</p>
          <h2 id="findings-heading">Findings</h2>
        </div>
        <span className="count">{answer.findings.length + answer.not_found.length}</span>
      </div>

      {bulkCount > 0 ? (
        <button type="button" className="button button-secondary full bulk-button" onClick={onBulkConfirm} disabled={disabled}>
          Confirm all verified quotes ({bulkCount})
        </button>
      ) : null}

      {answer.findings.length === 0 && answer.not_found.length === 0 ? (
        <div className="empty-state">
          <h3>No findings prepared</h3>
          <p>Review the retrieved passages and try the analysis again.</p>
        </div>
      ) : null}

      <div className="finding-list">
        {answer.findings.map((finding) => {
          const factState = conditionState(finding, answer.casus.facts);
          const notApplicable = factState === "nee";
          return (
            <article
              key={finding.id}
              className={`finding-card ${selectedId === finding.id ? "selected" : ""} ${notApplicable ? "not-applicable" : ""}`}
            >
              <div
                className="finding-select-surface"
                role="button"
                tabIndex={0}
                aria-pressed={selectedId === finding.id}
                aria-label={`Open official evidence for ${finding.subquestion}`}
                onClick={() => onSelect(finding.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(finding.id);
                  }
                }}
              >
                <div className="finding-topline">
                  <p className="subquestion">{finding.subquestion}</p>
                  <StatusBadge finding={finding} />
                </div>
                <p className="finding-statement">{finding.corrected_statement || finding.statement}</p>
                {finding.condition ? (
                  <div className="condition-box">
                    <strong>Condition (exact Dutch source wording):</strong> {finding.condition.quote}
                    <span className="condition-state">
                      {factState === "nee" ? "Not applicable to this case" : factState === "ja" ? "Applicable to this case" : "Conditional"}
                    </span>
                  </div>
                ) : null}
                {finding.status_reasons.map((reason) => <p className="status-reason" key={reason}>{reason}</p>)}
                <span className="finding-evidence-cue">
                  {selectedId === finding.id ? "Official evidence open" : "Open official evidence"}
                </span>
              </div>
              <ReviewActions finding={finding} reviewer={reviewer} disabled={disabled} onReview={onReview} />
            </article>
          );
        })}

        {answer.not_found.map((missing) => (
          <article className="finding-card missing-card" key={missing.subquestion}>
            <div className="finding-topline">
              <p className="subquestion">{missing.subquestion}</p>
              <NotFoundBadge />
            </div>
            <p>No evidence was found in the available official sources. This does not mean that no rule exists.</p>
            <div className="segmented decision-toggle">
              <button
                type="button"
                className={missing.decision === "vermelden" ? "active" : ""}
                onClick={() => onNotFoundDecision(missing.subquestion, "vermelden")}
                disabled={disabled}
              >
                Mention in reply
              </button>
              <button
                type="button"
                className={missing.decision === "weglaten" ? "active" : ""}
                onClick={() => onNotFoundDecision(missing.subquestion, "weglaten")}
                disabled={disabled}
              >
                Omit
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
