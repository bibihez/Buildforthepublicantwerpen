"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

import type { Nature, SourceListItem } from "@/lib/types";

type UploadResult = {
  title: string;
  passages: number;
};

type SourceFormProps = {
  sources: SourceListItem[];
  disabled?: boolean;
  onUpload: (formData: FormData) => Promise<UploadResult>;
};

type UploadState =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function SourceForm({ sources, disabled = false, onUpload }: SourceFormProps) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [nature, setNature] = useState<Nature>("wetgeving");
  const [issuer, setIssuer] = useState("");
  const [effectiveFromUnknown, setEffectiveFromUnknown] = useState(false);
  const [state, setState] = useState<UploadState>({ kind: "idle" });

  const sameIssuerSources = useMemo(() => {
    const normalizedIssuer = issuer.trim().toLocaleLowerCase("nl-BE");
    if (!normalizedIssuer) return [];

    return sources
      .filter(
        (source) =>
          source.active &&
          !source.superseded_by &&
          source.issuer.trim().toLocaleLowerCase("nl-BE") === normalizedIssuer,
      )
      .sort((a, b) => a.short_title.localeCompare(b.short_title, "nl-BE"));
  }, [issuer, sources]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ kind: "uploading" });

    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setState({ kind: "error", message: "Kies een pdf-bestand om toe te voegen." });
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLocaleLowerCase("nl-BE").endsWith(".pdf")) {
      setState({ kind: "error", message: "Alleen een pdf-bestand kan als officiële bron worden toegevoegd." });
      return;
    }

    if (nature === "wetgeving") {
      formData.delete("published_on");
      if (effectiveFromUnknown) formData.delete("effective_from");
    } else {
      formData.delete("effective_from");
      formData.delete("effective_until");
    }

    for (const key of [
      "adopted_on",
      "effective_from",
      "effective_until",
      "published_on",
      "origin_url",
      "notes",
      "supersedes_id",
    ]) {
      if (formData.get(key) === "") formData.delete(key);
    }

    try {
      const result = await onUpload(formData);
      formRef.current?.reset();
      setNature("wetgeving");
      setIssuer("");
      setEffectiveFromUnknown(false);
      setState({
        kind: "success",
        message: `Bron toegevoegd — ${result.passages} ${result.passages === 1 ? "passage" : "passages"}.`,
      });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "De bron kon niet worden toegevoegd.",
      });
    }
  }

  const isSubmitting = disabled || state.kind === "uploading";
  const inputClass =
    "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-900 outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 disabled:cursor-not-allowed disabled:bg-slate-100";
  const labelClass = "text-sm font-semibold text-slate-700";

  return (
    <form
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Nieuwe officiële bron</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Pdf toevoegen</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Voeg alleen een officiële publicatie toe. De broncontrole beoordeelt metadata en geldigheid, niet de
          juridische interpretatie van de inhoud.
        </p>
      </div>

      <fieldset disabled={isSubmitting} className="grid gap-5">
        <div>
          <label className={labelClass} htmlFor={`${formId}-file`}>
            Pdf-bestand <span aria-hidden="true">*</span>
          </label>
          <input
            accept="application/pdf,.pdf"
            className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:font-semibold file:text-teal-800`}
            id={`${formId}-file`}
            name="file"
            required
            type="file"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor={`${formId}-title`}>
              Titel <span aria-hidden="true">*</span>
            </label>
            <input className={inputClass} id={`${formId}-title`} name="title" required />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-short-title`}>
              Korte titel <span aria-hidden="true">*</span>
            </label>
            <input className={inputClass} id={`${formId}-short-title`} name="short_title" required />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-issuer`}>
              Uitgever <span aria-hidden="true">*</span>
            </label>
            <input
              className={inputClass}
              id={`${formId}-issuer`}
              name="issuer"
              onChange={(event) => setIssuer(event.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-territory`}>
              Grondgebied <span aria-hidden="true">*</span>
            </label>
            <input
              className={inputClass}
              id={`${formId}-territory`}
              name="territory"
              placeholder="Bijvoorbeeld Schoten"
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-level`}>
              Niveau <span aria-hidden="true">*</span>
            </label>
            <select className={inputClass} defaultValue="gemeentelijk" id={`${formId}-level`} name="level" required>
              <option value="gemeentelijk">Gemeentelijk</option>
              <option value="provinciaal">Provinciaal</option>
              <option value="vlaams">Vlaams</option>
              <option value="federaal">Federaal</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-nature`}>
              Aard <span aria-hidden="true">*</span>
            </label>
            <select
              className={inputClass}
              id={`${formId}-nature`}
              name="nature"
              onChange={(event) => {
                setNature(event.target.value as Nature);
                setEffectiveFromUnknown(false);
              }}
              value={nature}
            >
              <option value="wetgeving">Wetgeving</option>
              <option value="richtlijn">Richtlijn</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-status`}>
              Status <span aria-hidden="true">*</span>
            </label>
            <select className={inputClass} defaultValue="van_kracht" id={`${formId}-status`} name="status" required>
              <option value="van_kracht">Van kracht</option>
              <option value="historisch">Historisch</option>
              <option value="onbekend">Onbekend</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-adopted`}>
              Aangenomen op <span className="font-normal text-slate-500">(optioneel)</span>
            </label>
            <input className={inputClass} id={`${formId}-adopted`} name="adopted_on" type="date" />
          </div>
        </div>

        {nature === "wetgeving" ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Geldigheid wetgeving</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor={`${formId}-effective-from`}>
                  Van kracht vanaf {!effectiveFromUnknown ? <span aria-hidden="true">*</span> : null}
                </label>
                <input
                  className={inputClass}
                  disabled={effectiveFromUnknown}
                  id={`${formId}-effective-from`}
                  name="effective_from"
                  required={!effectiveFromUnknown}
                  type="date"
                />
              </div>
              <div>
                <label className={labelClass} htmlFor={`${formId}-effective-until`}>
                  Van kracht tot <span className="font-normal text-slate-500">(optioneel)</span>
                </label>
                <input className={inputClass} id={`${formId}-effective-until`} name="effective_until" type="date" />
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                checked={effectiveFromUnknown}
                className="size-4 accent-teal-700"
                onChange={(event) => setEffectiveFromUnknown(event.target.checked)}
                type="checkbox"
              />
              Datum van inwerkingtreding is onbekend
            </label>
          </div>
        ) : (
          <div>
            <label className={labelClass} htmlFor={`${formId}-published`}>
              Gepubliceerd op <span aria-hidden="true">*</span>
            </label>
            <input className={inputClass} id={`${formId}-published`} name="published_on" required type="date" />
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor={`${formId}-origin-url`}>
              Officiële link <span className="font-normal text-slate-500">(optioneel)</span>
            </label>
            <input className={inputClass} id={`${formId}-origin-url`} name="origin_url" type="url" />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-supersedes`}>
              Vervangt <span className="font-normal text-slate-500">(optioneel)</span>
            </label>
            <select
              className={inputClass}
              disabled={!issuer.trim() || sameIssuerSources.length === 0}
              id={`${formId}-supersedes`}
              name="supersedes_id"
            >
              <option value="">
                {!issuer.trim()
                  ? "Vul eerst de uitgever in"
                  : sameIssuerSources.length === 0
                    ? "Geen actieve bron van dezelfde uitgever"
                    : "Vervangt geen bestaande bron"}
              </option>
              {sameIssuerSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.short_title}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              Alleen actieve bronnen van exact dezelfde uitgever worden getoond.
            </p>
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-added-by`}>
              Toegevoegd door <span aria-hidden="true">*</span>
            </label>
            <input autoComplete="name" className={inputClass} id={`${formId}-added-by`} name="added_by" required />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-notes`}>
              Interne notitie <span className="font-normal text-slate-500">(optioneel)</span>
            </label>
            <input className={inputClass} id={`${formId}-notes`} name="notes" />
          </div>
        </div>
      </fieldset>

      <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite" className="min-h-6 text-sm" role="status">
          {state.kind === "success" ? (
            <div className="font-medium text-emerald-700">
              <p>{state.message}</p>
              <Link className="mt-1 inline-block underline underline-offset-2 hover:text-emerald-900" href="/">
                Ga naar Antwoorden en analyseer de vraag opnieuw
              </Link>
            </div>
          ) : null}
          {state.kind === "error" ? <p className="font-medium text-red-700">{state.message}</p> : null}
          {state.kind === "uploading" ? <p className="text-slate-600">Pdf verwerken en passages opbouwen…</p> : null}
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 disabled:cursor-wait disabled:bg-slate-400"
          disabled={isSubmitting}
          type="submit"
        >
          {state.kind === "uploading" ? "Bron toevoegen…" : "Bron toevoegen"}
        </button>
      </div>
    </form>
  );
}
