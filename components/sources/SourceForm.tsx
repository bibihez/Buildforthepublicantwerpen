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

function uploadErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "The source could not be added.";

  const exactTranslations: Record<string, string> = {
    "Expected a form containing a file": "A form containing a file is required.",
    "No file selected": "No file was selected.",
    "Invalid level": "The selected level is invalid.",
    "Invalid nature": "The selected source type is invalid.",
    "Invalid status": "The selected status is invalid.",
    "PDF files only": "Only PDF files are supported.",
    "The source being superseded does not exist": "The source to be superseded does not exist.",
    "No text found in the PDF (is it a scanned document?)":
      "No text was found in the PDF. It may be a scanned document.",
    "Something went wrong on the server": "The server encountered an error while adding the source.",
    "Verwacht een formulier met een bestand": "A form containing a file is required.",
    "Geen bestand gekozen": "No file was selected.",
    "Ongeldig niveau": "The selected level is invalid.",
    "Ongeldige aard": "The selected source type is invalid.",
    "Ongeldige status": "The selected status is invalid.",
    "Alleen PDF-bestanden": "Only PDF files are supported.",
    "De bron die vervangen wordt, bestaat niet": "The source to be superseded does not exist.",
    "Geen tekst gevonden in de PDF (gescand document?)":
      "No text was found in the PDF. It may be a scanned document.",
    "Er ging iets mis op de server": "The server encountered an error while adding the source.",
  };
  if (exactTranslations[error.message]) return exactTranslations[error.message];

  if (error.message.startsWith("Deze versie bestaat al:")) {
    return error.message.replace("Deze versie bestaat al:", "This version already exists:");
  }
  if (error.message.startsWith("This version already exists:")) return error.message;
  if (error.message.startsWith("Veld ontbreekt:")) {
    return "A required field is missing. Check the source details and try again.";
  }
  if (error.message.startsWith("Missing field:")) {
    return "A required field is missing. Check the source details and try again.";
  }
  if (error.message.startsWith("Ongeldige datum voor")) {
    return "One of the dates is invalid. Use YYYY-MM-DD.";
  }
  if (error.message.startsWith("Invalid date for")) {
    return "One of the dates is invalid. Use YYYY-MM-DD.";
  }
  if (error.message.startsWith("De aanvraag is mislukt")) {
    return "The request failed. Please try again.";
  }
  if (error.message.startsWith("The request failed")) return "The request failed. Please try again.";

  return "The source could not be added. Please try again.";
}

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
      setState({ kind: "error", message: "Select a PDF file to upload." });
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLocaleLowerCase("nl-BE").endsWith(".pdf")) {
      setState({ kind: "error", message: "Only a PDF file can be added as an official source." });
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
        message: `Source added — ${result.passages} ${result.passages === 1 ? "passage" : "passages"}.`,
      });
    } catch (error) {
      setState({
        kind: "error",
        message: uploadErrorMessage(error),
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
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">New official source</p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Add PDF</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Add official publications only. Source checks assess metadata and validity, not the legal interpretation
          of the content.
        </p>
      </div>

      <fieldset disabled={isSubmitting} className="grid gap-5">
        <div>
          <label className={labelClass} htmlFor={`${formId}-file`}>
            PDF file <span aria-hidden="true">*</span>
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
              Title <span aria-hidden="true">*</span>
            </label>
            <input className={inputClass} id={`${formId}-title`} name="title" required />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-short-title`}>
              Short title <span aria-hidden="true">*</span>
            </label>
            <input className={inputClass} id={`${formId}-short-title`} name="short_title" required />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-issuer`}>
              Issuer <span aria-hidden="true">*</span>
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
              Jurisdiction <span aria-hidden="true">*</span>
            </label>
            <input
              className={inputClass}
              id={`${formId}-territory`}
              name="territory"
              placeholder="For example, Schoten"
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-level`}>
              Level <span aria-hidden="true">*</span>
            </label>
            <select className={inputClass} defaultValue="gemeentelijk" id={`${formId}-level`} name="level" required>
              <option value="gemeentelijk">Municipal</option>
              <option value="provinciaal">Provincial</option>
              <option value="vlaams">Flemish</option>
              <option value="federaal">Federal</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-nature`}>
              Type <span aria-hidden="true">*</span>
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
              <option value="wetgeving">Legislation</option>
              <option value="richtlijn">Guidance</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-status`}>
              Status <span aria-hidden="true">*</span>
            </label>
            <select className={inputClass} defaultValue="van_kracht" id={`${formId}-status`} name="status" required>
              <option value="van_kracht">In force</option>
              <option value="historisch">Historical</option>
              <option value="onbekend">Unknown</option>
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-adopted`}>
              Adopted on <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input className={inputClass} id={`${formId}-adopted`} name="adopted_on" type="date" />
          </div>
        </div>

        {nature === "wetgeving" ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">Legislation validity</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor={`${formId}-effective-from`}>
                  Effective from {!effectiveFromUnknown ? <span aria-hidden="true">*</span> : null}
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
                  Effective until <span className="font-normal text-slate-500">(optional)</span>
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
              Effective date is unknown
            </label>
          </div>
        ) : (
          <div>
            <label className={labelClass} htmlFor={`${formId}-published`}>
              Published on <span aria-hidden="true">*</span>
            </label>
            <input className={inputClass} id={`${formId}-published`} name="published_on" required type="date" />
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor={`${formId}-origin-url`}>
              Official link <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input className={inputClass} id={`${formId}-origin-url`} name="origin_url" type="url" />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-supersedes`}>
              Supersedes <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <select
              className={inputClass}
              disabled={!issuer.trim() || sameIssuerSources.length === 0}
              id={`${formId}-supersedes`}
              name="supersedes_id"
            >
              <option value="">
                {!issuer.trim()
                  ? "Enter the issuer first"
                  : sameIssuerSources.length === 0
                    ? "No active source from the same issuer"
                    : "Does not supersede an existing source"}
              </option>
              {sameIssuerSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.short_title}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">
              Only active sources from the exact same issuer are shown.
            </p>
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-added-by`}>
              Added by <span aria-hidden="true">*</span>
            </label>
            <input autoComplete="name" className={inputClass} id={`${formId}-added-by`} name="added_by" required />
          </div>
          <div>
            <label className={labelClass} htmlFor={`${formId}-notes`}>
              Internal note <span className="font-normal text-slate-500">(optional)</span>
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
                Go to Answers and rerun the analysis
              </Link>
            </div>
          ) : null}
          {state.kind === "error" ? <p className="font-medium text-red-700">{state.message}</p> : null}
          {state.kind === "uploading" ? <p className="text-slate-600">Processing PDF and creating passages…</p> : null}
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 disabled:cursor-wait disabled:bg-slate-400"
          disabled={isSubmitting}
          type="submit"
        >
          {state.kind === "uploading" ? "Adding source…" : "Add source"}
        </button>
      </div>
    </form>
  );
}
