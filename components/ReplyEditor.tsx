"use client";

type Props = {
  value: string;
  stale: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  onRegenerate: () => void;
  onSave: () => void;
};

export function ReplyEditor({ value, stale, disabled, onChange, onRegenerate, onSave }: Props) {
  return (
    <section className="panel reply-panel" aria-labelledby="reply-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Reply</p>
          <h2 id="reply-heading">Draft for the entrepreneur</h2>
        </div>
        {stale ? <span className="badge badge-warning">Reply out of date</span> : <span className="badge badge-confirmed">Current version</span>}
      </div>
      <p className="hint">Edit the text freely. Nothing is sent automatically.</p>
      <textarea
        className="reply-editor"
        rows={12}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Draft reply"
      />
      <div className="button-row reply-buttons">
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
