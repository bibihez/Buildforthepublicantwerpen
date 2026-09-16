"use client";

import { Copy } from "@phosphor-icons/react";
import { useState } from "react";

type Props = {
  value: string;
  stale: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onRegenerate: () => void;
  onSave: () => void;
};

export function ReplyEditor({ value, stale, disabled, onChange, onRegenerate, onSave }: Props) {
  const [copied, setCopied] = useState(false);

  const copyDraft = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="panel reply-panel" aria-labelledby="reply-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Reply</p>
          <h2 id="reply-heading">Draft for the entrepreneur</h2>
        </div>
        {stale ? <span className="badge badge-warning">Reply out of date</span> : <span className="badge badge-confirmed">Current version</span>}
      </div>
      <p className="hint">
        Automatically refreshed from reviewed findings and exact source citations. Unverified web leads stay out until
        they are added and verified as sources. Nothing is sent automatically.
      </p>
      <textarea
        className="reply-editor"
        rows={12}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Draft reply"
      />
      <div className="button-row reply-buttons">
        <button type="button" className="button button-secondary" onClick={() => void copyDraft()} disabled={!value.trim()}>
          <Copy aria-hidden="true" />
          {copied ? "Copied" : "Copy draft"}
        </button>
        <button type="button" className="button button-secondary" onClick={onRegenerate} disabled={disabled}>
          Rebuild
        </button>
        <button type="button" className="button button-primary" onClick={onSave} disabled={disabled || !value.trim()}>
          Save answer version
        </button>
      </div>
    </section>
  );
}
