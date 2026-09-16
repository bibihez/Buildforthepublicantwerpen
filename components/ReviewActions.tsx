"use client";

import { useState } from "react";
import type { Finding, UpdateAnswerRequest } from "@/lib/types";

export type FindingReviewUpdate = NonNullable<UpdateAnswerRequest["finding_reviews"]>[number];

type Props = {
  finding: Finding;
  reviewer: string;
  disabled?: boolean;
  onReview: (review: FindingReviewUpdate) => void;
};

export function ReviewActions({ finding, reviewer, disabled, onReview }: Props) {
  const [mode, setMode] = useState<"none" | "correct" | "reject">("none");
  const [corrected, setCorrected] = useState(finding.corrected_statement || finding.statement);
  const [reason, setReason] = useState(finding.review_reason || "");
  const [conflictDecision, setConflictDecision] = useState<Finding["conflict_decision"]>(finding.conflict_decision);
  const [conflictReason, setConflictReason] = useState(finding.conflict_reason || "");
  const reviewedBy = reviewer.trim() || "Medewerker lokale economie";

  const base = { finding_id: finding.id, reviewed_by: reviewedBy };

  if (finding.status === "tegenstrijdig" && finding.review === "open") {
    return (
      <div className="review-box" onClick={(event) => event.stopPropagation()}>
        <label>
          Beslissing bij tegenstrijdige passages
          <select
            value={conflictDecision || ""}
            disabled={disabled}
            onChange={(event) => setConflictDecision(event.target.value as Finding["conflict_decision"])}
          >
            <option value="">Kies een beslissing</option>
            <option value="deze">Deze passage volgen</option>
            <option value="andere">Andere passage volgen</option>
            <option value="onzeker_vermelden">Als onzeker vermelden</option>
            <option value="weglaten">Weglaten</option>
          </select>
        </label>
        <label>
          Motivering
          <textarea value={conflictReason} onChange={(event) => setConflictReason(event.target.value)} rows={2} />
        </label>
        <button
          type="button"
          className="button button-primary"
          disabled={disabled || !conflictDecision || !conflictReason.trim()}
          onClick={() => onReview({
            ...base,
            review: conflictDecision === "weglaten" ? "verworpen" : "bevestigd",
            review_reason: conflictReason,
            conflict_decision: conflictDecision,
            conflict_reason: conflictReason,
          })}
        >
          Beslissing opslaan
        </button>
      </div>
    );
  }

  if (finding.review !== "open") {
    return finding.review_reason ? <p className="review-note">Motivering: {finding.review_reason}</p> : null;
  }

  return (
    <div className="review-actions" onClick={(event) => event.stopPropagation()}>
      <div className="button-row">
        <button
          className="button button-small button-primary"
          type="button"
          disabled={disabled}
          onClick={() => onReview({ ...base, review: "bevestigd" })}
        >
          Bevestig
        </button>
        <button className="button button-small button-secondary" type="button" onClick={() => setMode("correct")} disabled={disabled}>
          Corrigeer
        </button>
        <button className="button button-small button-danger-quiet" type="button" onClick={() => setMode("reject")} disabled={disabled}>
          Verwerp
        </button>
      </div>

      {mode === "correct" ? (
        <div className="inline-form">
          <label>
            Gecorrigeerde tekst
            <textarea value={corrected} onChange={(event) => setCorrected(event.target.value)} rows={3} />
          </label>
          <button
            type="button"
            className="button button-primary button-small"
            disabled={!corrected.trim() || corrected.trim() === finding.statement.trim()}
            onClick={() => onReview({ ...base, review: "gecorrigeerd", corrected_statement: corrected.trim() })}
          >
            Correctie opslaan
          </button>
        </div>
      ) : null}

      {mode === "reject" ? (
        <div className="inline-form">
          <label>
            Reden voor verwerping
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} />
          </label>
          <button
            type="button"
            className="button button-danger button-small"
            disabled={!reason.trim()}
            onClick={() => onReview({ ...base, review: "verworpen", review_reason: reason.trim() })}
          >
            Verwerping opslaan
          </button>
        </div>
      ) : null}
    </div>
  );
}
