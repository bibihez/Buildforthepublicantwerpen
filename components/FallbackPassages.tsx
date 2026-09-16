import type { ApiError } from "@/lib/types";

type Fallback = NonNullable<ApiError["fallback"]>;

export function FallbackPassages({ fallback }: { fallback: Fallback }) {
  return (
    <section className="panel fallback-panel" aria-labelledby="fallback-heading">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Manual review</p>
          <h2 id="fallback-heading">Retrieved source passages</h2>
        </div>
        <span className="count">{fallback.candidate_ids.length}</span>
      </div>
      <p className="hint">
        The AI produced no findings. These original Dutch source passages are not conclusions; review them directly.
      </p>
      <ol className="fallback-list">
        {fallback.candidate_ids.map((passageId) => {
          const passage = fallback.passages[passageId];
          if (!passage) {
            return <li className="error-banner" key={passageId}>Passage {passageId} is missing from the answer.</li>;
          }
          const source = fallback.sources[passage.source_id];
          return (
            <li key={passageId}>
              <div className="citation-header">
                <div>
                  <strong>{source?.short_title || passage.source_id}</strong>
                  <p>{passage.article || "Passage"}, p. {passage.page_from}{passage.page_to !== passage.page_from ? `-${passage.page_to}` : ""}</p>
                </div>
                {source ? (
                  <a className="button button-small button-secondary" href={`/files/${source.id}#page=${passage.page_from}`} target="_blank" rel="noreferrer">
                    Open source
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
