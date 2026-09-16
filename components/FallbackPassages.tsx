import type { ApiError } from "@/lib/types";

type Fallback = NonNullable<ApiError["fallback"]>;

export function FallbackPassages({ fallback }: { fallback: Fallback }) {
  return (
    <section className="panel fallback-panel" aria-labelledby="fallback-heading">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Handmatige controle</p>
          <h2 id="fallback-heading">Gevonden bronpassages</h2>
        </div>
        <span className="count">{fallback.candidate_ids.length}</span>
      </div>
      <p className="hint">
        De AI stelde geen bevindingen op. Deze zoekresultaten zijn geen conclusies; beoordeel de passages zelf.
      </p>
      <ol className="fallback-list">
        {fallback.candidate_ids.map((passageId) => {
          const passage = fallback.passages[passageId];
          if (!passage) {
            return <li className="error-banner" key={passageId}>Passage {passageId} ontbreekt in het antwoord.</li>;
          }
          const source = fallback.sources[passage.source_id];
          return (
            <li key={passageId}>
              <div className="citation-header">
                <div>
                  <strong>{source?.short_title || passage.source_id}</strong>
                  <p>{passage.article || "Passage"} · p. {passage.page_from}{passage.page_to !== passage.page_from ? `–${passage.page_to}` : ""}</p>
                </div>
                {source ? (
                  <a className="button button-small button-secondary" href={`/files/${source.id}#page=${passage.page_from}`} target="_blank" rel="noreferrer">
                    Open bron
                  </a>
                ) : null}
              </div>
              <p className="passage-text">{passage.text}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
