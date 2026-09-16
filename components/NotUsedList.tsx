import type { AnswerResponse } from "@/lib/types";

export function NotUsedList({ data }: { data: AnswerResponse }) {
  if (data.answer.not_used.length === 0) return null;

  return (
    <section className="panel not-used-panel">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Transparantie</p>
          <h2>Relevante niet-gebruikte bronnen</h2>
        </div>
        <span className="count">{data.answer.not_used.length}</span>
      </div>
      <div className="not-used-list">
        {data.answer.not_used.map((item, index) => {
          const source = data.sources[item.source_id];
          const passage = data.passages[item.passage_id];
          return (
            <article key={`${item.source_id}-${item.passage_id}-${index}`}>
              <strong>{source?.short_title || item.source_id}</strong>
              <p>{item.reason}</p>
              {passage ? <small>{passage.article || "Passage"}, p. {passage.page_from}</small> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
