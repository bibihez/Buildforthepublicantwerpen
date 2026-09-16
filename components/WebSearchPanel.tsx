"use client";

import { useEffect, useState } from "react";
import type { ApiError, WebSearchResponse } from "@/lib/types";

type Outcome = { key: string; result: WebSearchResponse | null; error: string | null };

async function runSearch(question: string, allDomains: boolean): Promise<WebSearchResponse> {
  const response = await fetch("/api/web-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, all_domains: allDomains }),
  });
  const body = (await response.json()) as WebSearchResponse | ApiError;
  if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Search failed");
  return body;
}

/** Government sites first; only when they cite nothing, the wider web (marked as non-government). */
async function searchWithFallback(question: string): Promise<WebSearchResponse> {
  const official = await runSearch(question, false);
  return official.results.length ? official : runSearch(question, true);
}

/**
 * Runs by itself once per analysis (`runKey`). Results are leads, never evidence: a document only counts after an
 * officer uploads it under Sources.
 */
export function WebSearchPanel({ question, runKey }: { question: string; runKey: string }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    if (!question.trim()) return;
    let cancelled = false;
    searchWithFallback(question)
      .then((result) => {
        if (!cancelled) setOutcome({ key: runKey, result, error: null });
      })
      .catch((caught: unknown) => {
        if (!cancelled) setOutcome({ key: runKey, result: null, error: caught instanceof Error ? caught.message : "Search failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [runKey, question]);

  const current = outcome?.key === runKey ? outcome : null;
  const result = current?.result ?? null;

  return (
    <section className="panel web-search-panel" aria-labelledby="web-search-heading" aria-busy={!current}>
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Find sources</p>
          <h2 id="web-search-heading">Found on the web</h2>
        </div>
        {!current ? <span className="muted">Searching…</span> : null}
      </div>
      <p className="hint">
        Web result—not verified and not evidence. A document only counts after an officer uploads it under Sources.
      </p>
      {current?.error ? <div className="error-banner" role="alert">{current.error}</div> : null}
      {result ? (
        <div className="web-search-result">
          {result.all_domains ? (
            <p className="muted">Nothing found on government websites, so the wider web was searched.</p>
          ) : null}
          <p className="web-search-summary">{result.summary}</p>
          {result.results.length ? (
            <ol className="web-search-list">
              {result.results.map((item) => (
                <li key={item.url}>
                  <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                  <span className="chip-row">
                    <span className="chip">{item.domain}</span>
                    <span className={`badge ${item.official ? "badge-citaat_gecontroleerd" : "badge-warning"}`}>
                      {item.official ? "Government website" : "Non-government website"}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">No pages cited.</p>
          )}
          <p className="muted">Searched on {new Date(result.searched_at).toLocaleString("en-GB")} · {result.model}</p>
        </div>
      ) : null}
    </section>
  );
}
