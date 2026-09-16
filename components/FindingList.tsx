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
  return facts.find((fact) => fact.id === finding.condition?.fact_id)?.answer || "onbekend";
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
          <p className="eyebrow">Beoordeling</p>
          <h2 id="findings-heading">Bevindingen</h2>
        </div>
        <span className="count">{answer.findings.length + answer.not_found.length}</span>
      </div>

      {bulkCount > 0 ? (
        <button type="button" className="button button-secondary full bulk-button" onClick={onBulkConfirm} disabled={disabled}>
          Bevestig alle gecontroleerde citaten ({bulkCount})
        </button>
      ) : null}

      {answer.findings.length === 0 && answer.not_found.length === 0 ? (
        <div className="empty-state">
          <h3>Geen bevindingen opgesteld</h3>
          <p>Controleer de gevonden passages en probeer de analyse opnieuw.</p>
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
              onClick={() => onSelect(finding.id)}
            >
              <div className="finding-topline">
                <p className="subquestion">{finding.subquestion}</p>
                <StatusBadge finding={finding} />
              </div>
              <p className="finding-statement">{finding.corrected_statement || finding.statement}</p>
              {finding.condition ? (
                <div className="condition-box">
                  <strong>Voorwaarde:</strong> {finding.condition.quote}
                  <span className="condition-state">
                    {factState === "nee" ? "Niet van toepassing volgens casus" : factState === "ja" ? "Van toepassing volgens casus" : "Voorwaardelijk"}
                  </span>
                </div>
              ) : null}
              {finding.status_reasons.map((reason) => <p className="status-reason" key={reason}>{reason}</p>)}
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
            <p>Geen bewijs gevonden in de beschikbare officiële bronnen. Dit betekent niet dat er geen regel bestaat.</p>
            <div className="segmented decision-toggle">
              <button
                type="button"
                className={missing.decision === "vermelden" ? "active" : ""}
                onClick={() => onNotFoundDecision(missing.subquestion, "vermelden")}
                disabled={disabled}
              >
                Vermelden in antwoord
              </button>
              <button
                type="button"
                className={missing.decision === "weglaten" ? "active" : ""}
                onClick={() => onNotFoundDecision(missing.subquestion, "weglaten")}
                disabled={disabled}
              >
                Weglaten
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
