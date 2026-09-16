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
        <p className="eyebrow">Menselijke goedkeuring</p>
        <h2 id="approval-heading">{approved ? "Deze versie is goedgekeurd" : "Controleer en keur deze versie goed"}</h2>
        {!approved && blockers.length > 0 ? (
          <ul className="blocker-list">
            {blockers.map((blocker, index) => <li key={`${blocker.code}-${blocker.ref || index}`}>{blocker.message}</li>)}
          </ul>
        ) : null}
      </div>
      <div className="approve-controls">
        <label>
          Naam medewerker
          <input value={reviewer} onChange={(event) => onReviewerChange(event.target.value)} disabled={disabled || approved} placeholder="Voor- en achternaam" />
        </label>
        <div className="button-row">
          <button type="button" className="button button-primary" onClick={onApprove} disabled={disabled || approved || blockers.length > 0 || !reviewer.trim()}>
            {approved ? "Goedgekeurd" : "Goedkeuren"}
          </button>
          <button type="button" className="button button-secondary" onClick={copyReply} disabled={!replyText.trim()}>
            Kopieer antwoord
          </button>
        </div>
      </div>
    </section>
  );
}
