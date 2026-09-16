"use client";

import { useState } from "react";
import type { ApiError, WebSearchResponse } from "@/lib/types";

/** Looks online for a newer version of one source. Replacing it stays an officer upload with "Vervangt". */
export function VersionCheck({ sourceId }: { sourceId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WebSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/sources/${encodeURIComponent(sourceId)}/check-update`, { method: "POST" });
      const body = (await response.json()) as WebSearchResponse | ApiError;
      if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Check failed");
      setResult(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Check failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">Newer version online?</p>
          <p className="text-xs text-slate-600">Web result. Not verified. A newer version only counts once an officer uploads it with &quot;Replaces&quot;.</p>
        </div>
        <button
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          disabled={loading}
          onClick={check}
          type="button"
        >
          {loading ? "Searching…" : "Search for a newer version"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs font-medium text-red-700" role="alert">{error}</p> : null}
      {result ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="whitespace-pre-wrap">{result.summary}</p>
          {result.results.length ? (
            <ul className="mt-2 list-disc pl-5">
              {result.results.map((item) => (
                <li key={item.url}>
                  <a className="font-semibold text-teal-800 underline" href={item.url} rel="noreferrer" target="_blank">{item.title}</a>{" "}
                  <span className="text-xs text-slate-600">({item.domain}{item.official ? ", government site" : ""})</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
