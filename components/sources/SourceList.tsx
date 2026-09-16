"use client";

import { Fragment, useState } from "react";
import type { FormEvent } from "react";

import type { SourceListItem } from "@/lib/types";

import { SourceEvents } from "./SourceEvents";
import { VersionCheck } from "./VersionCheck";

const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

const levelLabels: Record<SourceListItem["level"], string> = {
  federaal: "Federal",
  vlaams: "Flemish",
  provinciaal: "Provincial",
  gemeentelijk: "Municipal",
};

const natureLabels: Record<SourceListItem["nature"], string> = {
  wetgeving: "Legislation",
  richtlijn: "Guidance",
};

const statusLabels: Record<SourceListItem["status"], string> = {
  van_kracht: "In force",
  historisch: "Historical",
  onbekend: "Unknown",
};

function formatDate(value?: string | null) {
  if (!value) return "Not provided";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function lastEventDate(source: SourceListItem) {
  const latest = [...source.events].sort((a, b) => b.at.localeCompare(a.at))[0];
  return latest ? formatDate(latest.at.slice(0, 10)) : formatDate(source.added_at.slice(0, 10));
}

type SourceListProps = {
  sources: SourceListItem[];
  pendingId: string | null;
  onDeactivate: (sourceId: string, reason: string, by: string) => Promise<void>;
};

function deactivationErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "The source could not be deactivated.";

  const translations: Record<string, string> = {
    "Source not found": "Source not found.",
    "Provide a reason": "Enter a reason for deactivation.",
    "Officer name is missing": "Enter the officer's name.",
    "Invalid request": "The request is invalid.",
    "The active field is missing": "The source status is missing from the request.",
    "Something went wrong on the server": "The server encountered an error while deactivating the source.",
    "Bron niet gevonden": "Source not found.",
    "Geef een reden op": "Enter a reason for deactivation.",
    "Naam van de medewerker ontbreekt": "Enter the officer's name.",
    "Ongeldige aanvraag": "The request is invalid.",
    "Veld active ontbreekt": "The source status is missing from the request.",
    "Er ging iets mis op de server": "The server encountered an error while deactivating the source.",
  };
  if (translations[error.message]) return translations[error.message];
  if (error.message.startsWith("De aanvraag is mislukt")) return "The request failed. Please try again.";
  if (error.message.startsWith("The request failed")) return "The request failed. Please try again.";
  return "The source could not be deactivated. Please try again.";
}

export function SourceList({ sources, pendingId, onDeactivate }: SourceListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDeactivate(event: FormEvent<HTMLFormElement>, sourceId: string) {
    event.preventDefault();
    setActionError(null);
    const form = new FormData(event.currentTarget);
    const reason = String(form.get("reason") ?? "").trim();
    const by = String(form.get("by") ?? "").trim();

    try {
      await onDeactivate(sourceId, reason, by);
      setDeactivatingId(null);
    } catch (error) {
      setActionError(deactivationErrorMessage(error));
    }
  }

  if (sources.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <h2 className="text-lg font-semibold text-slate-900">No sources available yet</h2>
        <p className="mt-2 text-sm text-slate-600">Add the first official PDF source below.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold" scope="col">Source</th>
              <th className="px-4 py-3 font-semibold" scope="col">Level and type</th>
              <th className="px-4 py-3 font-semibold" scope="col">Jurisdiction</th>
              <th className="px-4 py-3 font-semibold" scope="col">Dates</th>
              <th className="px-4 py-3 font-semibold" scope="col">Status</th>
              <th className="px-4 py-3 text-right font-semibold" scope="col">Passages</th>
              <th className="px-4 py-3 font-semibold" scope="col">Last change</th>
              <th className="px-4 py-3 text-right font-semibold" scope="col">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sources.map((source) => {
              const expanded = expandedId === source.id;
              const deactivating = deactivatingId === source.id;
              const busy = pendingId === source.id;
              const superseded = Boolean(source.superseded_by);
              const unavailable = !source.active || superseded;
              const replacementTitle = superseded
                ? sources.find((candidate) => candidate.id === source.superseded_by)?.short_title
                : null;

              return (
                <Fragment key={source.id}>
                <tr className={unavailable ? "bg-slate-50 align-top text-slate-500" : "align-top"}>
                  <td className="px-4 py-4">
                    <p className="max-w-64 font-semibold text-slate-900">{source.short_title}</p>
                    <p className="mt-1 max-w-64 text-xs leading-5 text-slate-500">{source.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{source.issuer}</p>
                  </td>
                  <td className="px-4 py-4 capitalize">
                    {levelLabels[source.level]}<br />
                    <span className="text-xs text-slate-500">{natureLabels[source.nature]}</span>
                  </td>
                  <td className="px-4 py-4">{source.territory}</td>
                  <td className="px-4 py-4 text-xs leading-5">
                    {source.nature === "wetgeving" ? (
                      <>
                        <span>From {formatDate(source.effective_from)}</span><br />
                        <span>Until {formatDate(source.effective_until)}</span>
                      </>
                    ) : (
                      <span>Published {formatDate(source.published_on)}</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        !unavailable
                          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-700/15"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {superseded ? "Superseded" : source.active ? "Active" : "Deactivated"}
                    </span>
                    {superseded ? (
                      <p className="mt-2 max-w-36 text-xs text-slate-500">
                        By {replacementTitle ?? "a newer source"}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">{statusLabels[source.status]}</p>
                  </td>
                  <td className="px-4 py-4 text-right tabular-nums">{source.passage_count}</td>
                  <td className="px-4 py-4 text-xs">{lastEventDate(source)}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        aria-expanded={expanded}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-700"
                        onClick={() => setExpandedId(expanded ? null : source.id)}
                        type="button"
                      >
                        {expanded ? "Close history" : "Show history"}
                      </button>
                      {source.active && !superseded ? (
                        <button
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-700 disabled:cursor-wait disabled:opacity-60"
                          disabled={busy}
                          onClick={() => {
                            setActionError(null);
                            setDeactivatingId(deactivating ? null : source.id);
                          }}
                          type="button"
                        >
                          Deactivate
                        </button>
                      ) : null}
                    </div>

                    {deactivating ? (
                      <form
                        className="mt-3 min-w-72 rounded-xl border border-red-200 bg-red-50 p-3"
                        onSubmit={(event) => handleDeactivate(event, source.id)}
                      >
                        <label className="block text-xs font-semibold text-slate-800">
                          Reason for deactivation
                          <textarea
                            autoFocus
                            className="mt-1.5 min-h-20 w-full resize-y rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                            minLength={3}
                            name="reason"
                            required
                          />
                        </label>
                        <label className="mt-3 block text-xs font-semibold text-slate-800">
                          Officer
                          <input
                            autoComplete="name"
                            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                            name="by"
                            required
                          />
                        </label>
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white"
                            onClick={() => setDeactivatingId(null)}
                            type="button"
                          >
                            Cancel
                          </button>
                          <button
                            className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:cursor-wait disabled:bg-slate-400"
                            disabled={busy}
                            type="submit"
                          >
                            {busy ? "Deactivating…" : "Confirm deactivation"}
                          </button>
                        </div>
                      </form>
                    ) : null}

                    {deactivating && actionError ? (
                      <p className="mt-2 max-w-72 text-xs font-medium text-red-700" role="alert">{actionError}</p>
                    ) : null}

                  </td>
                </tr>
                {expanded ? (
                  <tr className="bg-slate-50">
                    <td className="px-4 py-4" colSpan={8}>
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="mb-3 flex items-center justify-between gap-4">
                          <p className="font-semibold text-slate-900">Source history: {source.short_title}</p>
                          <button
                            className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            onClick={() => setExpandedId(null)}
                            type="button"
                          >
                            Close
                          </button>
                        </div>
                        <SourceEvents events={source.events} />
                        <VersionCheck sourceId={source.id} />
                      </div>
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
