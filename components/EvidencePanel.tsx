import type { AnswerResponse, Citation, Passage } from "@/lib/types";

function excerpt(passage: Passage, citation: Citation) {
  const exactIndex = passage.text.indexOf(citation.quote);
  const hint = citation.quote.slice(0, 48).trim();
  const fallbackIndex = hint ? passage.text.indexOf(hint) : -1;
  const index = exactIndex >= 0 ? exactIndex : fallbackIndex >= 0 ? fallbackIndex : 0;
  const start = Math.max(0, index - 150);
  const end = Math.min(passage.text.length, index + Math.max(citation.quote.length, 48) + 150);
  return `${start > 0 ? "…" : ""}${passage.text.slice(start, end).trim()}${end < passage.text.length ? "…" : ""}`;
}

export function EvidencePanel({ data, selectedId }: { data: AnswerResponse; selectedId: string | null }) {
  const finding = data.answer.findings.find((item) => item.id === selectedId) || data.answer.findings[0];

  if (!finding) {
    return (
      <aside className="panel evidence-panel">
        <p className="eyebrow">Bewijs</p>
        <h2>Bronpassages</h2>
        <div className="empty-state">
          <p>Selecteer een bevinding om het bewijs te controleren.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="panel evidence-panel" aria-labelledby="evidence-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Bewijs</p>
          <h2 id="evidence-heading">Bronpassages</h2>
        </div>
        <span className="count">{finding.citations.length}</span>
      </div>
      <p className="evidence-warning">Een gecontroleerd citaat bewijst niet dat de interpretatie juridisch juist is.</p>

      {finding.citations.map((citation, index) => {
        const passage = data.passages[citation.passage_id];
        const source = passage ? data.sources[passage.source_id] : undefined;
        const verdict = source ? data.answer.verdicts.find((item) => item.source_id === source.id) : undefined;

        if (!passage || !source) {
          return <p className="error-banner" key={`${citation.passage_id}-${index}`}>Passage {citation.passage_id} ontbreekt in het antwoord.</p>;
        }

        return (
          <section className="citation" key={`${citation.passage_id}-${index}`}>
            <div className="citation-header">
              <div>
                <strong>{source.short_title}</strong>
                <p>{passage.article || "Passage"} · p. {passage.page_from}{passage.page_to !== passage.page_from ? `–${passage.page_to}` : ""}</p>
              </div>
              <a className="button button-small button-secondary" href={`/files/${source.id}#page=${passage.page_from}`} target="_blank" rel="noreferrer">
                Open bron
              </a>
            </div>
            <div className="chip-row">
              <span className="chip">{source.level}</span>
              <span className="chip">{source.nature}</span>
              <span className="chip">{source.territory}</span>
            </div>
            <div className="quote-block">
              <p className="quote-label">Exact citaat</p>
              <blockquote><mark>{citation.quote}</mark></blockquote>
            </div>
            <details>
              <summary>Toon omringende passage</summary>
              <p className="passage-text">{excerpt(passage, citation)}</p>
            </details>
            <div className="source-check">
              <strong>Broncontrole</strong>
              <p className="verdict-line">
                <span aria-hidden="true">{verdict?.verdict === "gecontroleerd" ? "✓" : verdict?.verdict === "onzeker" ? "?" : "×"}</span>
                {verdict?.verdict === "gecontroleerd" ? "Broncontrole geslaagd" : verdict?.verdict === "onzeker" ? "Broncontrole onzeker" : "Bron niet gebruikt"}
              </p>
              {verdict?.reasons.map((reason) => <p key={reason}>{reason}</p>)}
              <p className="hint">Broncontrole controleert metadata, niet de juridische toepasselijkheid.</p>
            </div>
          </section>
        );
      })}
    </aside>
  );
}
