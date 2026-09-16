"use client";

import { useState } from "react";
import type { ApiError, WebSearchResponse } from "@/lib/types";

/** Web search finds candidate documents. Nothing here is evidence until the officer uploads it under Bronnen. */
export function WebSearchPanel({ question }: { question: string }) {
  const [allDomains, setAllDomains] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WebSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, all_domains: allDomains }),
      });
      const body = (await response.json()) as WebSearchResponse | ApiError;
      if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Zoeken mislukt");
      setResult(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Zoeken mislukt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel web-search-panel" aria-labelledby="web-search-heading">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Bronnen zoeken</p>
          <h2 id="web-search-heading">Zoek op internet</h2>
        </div>
        <div className="button-row">
          <label className="muted web-search-toggle">
            <input type="checkbox" checked={allDomains} onChange={(event) => setAllDomains(event.target.checked)} disabled={loading} />{" "}
            Ook niet-overheidssites
          </label>
          <button type="button" className="button button-secondary button-small" onClick={search} disabled={loading || !question.trim()}>
            {loading ? "Zoeken…" : "Zoek officiële documenten"}
          </button>
        </div>
      </div>
      <p className="hint">
        Webresultaat — niet geverifieerd, geen bewijs. Een document telt pas mee nadat een medewerker het oplaadt onder Bronnen.
      </p>
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      {result ? (
        <div className="web-search-result">
          <p className="web-search-summary">{result.summary}</p>
          {result.results.length ? (
            <ol className="web-search-list">
              {result.results.map((item) => (
                <li key={item.url}>
                  <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                  <span className="chip-row">
                    <span className="chip">{item.domain}</span>
                    <span className={`badge ${item.official ? "badge-citaat_gecontroleerd" : "badge-warning"}`}>
                      {item.official ? "Overheidssite" : "Geen overheidssite"}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">Geen pagina&apos;s geciteerd.</p>
          )}
          <p className="muted">Gezocht op {new Date(result.searched_at).toLocaleString("nl-BE")} · {result.model}</p>
        </div>
      ) : null}
    </section>
  );
}
