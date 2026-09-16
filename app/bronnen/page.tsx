"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SourceForm } from "@/components/sources/SourceForm";
import { SourceList } from "@/components/sources/SourceList";
import { sourceClient } from "@/lib/client";
import type { SourceListItem } from "@/lib/types";

async function fetchSources() {
  const body = await sourceClient.list();
  if (!Array.isArray(body.sources)) {
    throw new Error("De bronnenlijst heeft een onverwacht formaat.");
  }
  return body.sources;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [changeNotice, setChangeNotice] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    try {
      setSources(await fetchSources());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "De bronnen konden niet worden geladen.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchSources()
      .then((nextSources) => {
        if (!cancelled) setSources(nextSources);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "De bronnen konden niet worden geladen.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const sortedSources = useMemo(
    () => [...sources].sort((a, b) => Number(b.active) - Number(a.active) || a.short_title.localeCompare(b.short_title, "nl-BE")),
    [sources],
  );

  async function uploadSource(formData: FormData) {
    const body = await sourceClient.upload(formData);
    await loadSources();
    return { title: body.source.short_title, passages: body.passages };
  }

  async function deactivateSource(sourceId: string, reason: string, by: string) {
    setPendingId(sourceId);
    try {
      const body = await sourceClient.setActive(sourceId, false, reason, by);
      const sourceTitle = sources.find((source) => source.id === sourceId)?.short_title ?? "Bron";
      setSources((current) =>
        current.map((item) =>
          item.id === sourceId
            ? { ...item, ...body.source, events: item.events }
            : item,
        ),
      );
      await loadSources();
      setChangeNotice(`${sourceTitle} is gedeactiveerd. Nieuwe analyses gebruiken deze bron niet meer.`);
    } finally {
      setPendingId(null);
    }
  }

  const activeCount = sources.filter((source) => source.active && !source.superseded_by).length;
  const passageCount = sources.reduce((total, source) => total + source.passage_count, 0);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-8 lg:px-8">
        <section aria-labelledby="sources-heading">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-700">Officiële bewijsbronnen</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight" id="sources-heading">Bronnenbeheer</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Broncontroles toetsen status, grondgebied en geldigheidsdata. Ze bepalen niet automatisch of een
                regel juridisch van toepassing is op een casus.
              </p>
            </div>
            {!loading && !loadError ? (
              <div className="flex gap-3" aria-label="Samenvatting bronnen">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                  <span className="block text-xl font-semibold tabular-nums">{activeCount}</span>
                  <span className="text-xs text-slate-500">actieve bronnen</span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                  <span className="block text-xl font-semibold tabular-nums">{passageCount}</span>
                  <span className="text-xs text-slate-500">passages</span>
                </div>
              </div>
            ) : null}
          </div>

          {changeNotice ? (
            <div className="mb-4 flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 sm:flex-row sm:items-center sm:justify-between" role="status">
              <p>{changeNotice}</p>
              <Link className="shrink-0 font-semibold underline underline-offset-2" href="/">
                Analyseer de vraag opnieuw
              </Link>
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-600" role="status">
              Bronnen laden…
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5" role="alert">
              <p className="font-semibold text-red-900">Bronnen niet geladen</p>
              <p className="mt-1 text-sm text-red-800">{loadError}</p>
              <button
                className="mt-4 rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
                onClick={() => {
                  setLoading(true);
                  setLoadError(null);
                  void loadSources();
                }}
                type="button"
              >
                Opnieuw proberen
              </button>
            </div>
          ) : (
            <SourceList onDeactivate={deactivateSource} pendingId={pendingId} sources={sortedSources} />
          )}
        </section>

        <section aria-label="Nieuwe bron toevoegen">
          <SourceForm disabled={loading || Boolean(loadError)} onUpload={uploadSource} sources={sortedSources} />
        </section>
      </div>
    </main>
  );
}
