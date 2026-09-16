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
          <p className="eyebrow">Antwoord</p>
          <h2 id="reply-heading">Concept voor de ondernemer</h2>
        </div>
        {stale ? <span className="badge badge-warning">Antwoord verouderd</span> : <span className="badge badge-confirmed">Actuele versie</span>}
      </div>
      <p className="hint">Bewerk de tekst vrij. Er wordt niets automatisch verzonden.</p>
      <textarea
        className="reply-editor"
        rows={12}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Conceptantwoord"
      />
      <div className="button-row reply-buttons">
        <button type="button" className="button button-secondary" onClick={onRegenerate} disabled={disabled}>
          Opnieuw opbouwen
        </button>
        <button type="button" className="button button-primary" onClick={onSave} disabled={disabled || !value.trim()}>
          Antwoordversie opslaan
        </button>
      </div>
    </section>
  );
}
