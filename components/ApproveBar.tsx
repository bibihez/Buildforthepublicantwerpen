"use client";

import type { ApproveBlocker } from "@/lib/types";

type Props = {
  approved: boolean;
  reviewer: string;
  replyText: string;
  blockers: ApproveBlocker[];
  disabled?: boolean;
  onReviewerChange: (name: string) => void;
  onApprove: () => void;
};

export function ApproveBar({ approved, reviewer, replyText, blockers, disabled, onReviewerChange, onApprove }: Props) {
  const copyReply = async () => {
    await navigator.clipboard.writeText(replyText);
  };

  return (
    <section className="approve-bar" aria-labelledby="approval-heading">
      <div>
        <p className="eyebrow">Human approval</p>
        <h2 id="approval-heading">{approved ? "This version is approved" : "Review and approve this version"}</h2>
        {!approved && blockers.length > 0 ? (
          <ul className="blocker-list">
            {blockers.map((blocker, index) => <li key={`${blocker.code}-${blocker.ref || index}`}>{blocker.message}</li>)}
          </ul>
        ) : null}
      </div>
      <div className="approve-controls">
        <label>
          Officer name
          <input value={reviewer} onChange={(event) => onReviewerChange(event.target.value)} disabled={disabled || approved} placeholder="First and last name" />
        </label>
        <div className="button-row">
          <button type="button" className="button button-primary" onClick={onApprove} disabled={disabled || approved || blockers.length > 0 || !reviewer.trim()}>
            {approved ? "Approved" : "Approve"}
          </button>
          <button type="button" className="button button-secondary" onClick={copyReply} disabled={!replyText.trim()}>
            Copy reply
          </button>
        </div>
      </div>
    </section>
  );
}
