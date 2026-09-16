"use client";

import { useEffect, useRef, useState } from "react";
import type { ApiError, Note } from "@/lib/types";

type Props = {
  /** With a question: only related notes. Without: all notes (Notities page). */
  question?: string;
  defaultTopic?: string;
  author?: string;
};

/** Officer knowledge, typed or dictated. Never evidence and never given to the AI. */
export function NotesPanel({ question, defaultTopic = "", author = "" }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [topic, setTopic] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [name, setName] = useState<string | null>(null);
  const [dictated, setDictated] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const listUrl = question ? `/api/notes?q=${encodeURIComponent(question)}` : "/api/notes";
  useEffect(() => {
    let cancelled = false;
    fetch(listUrl)
      .then((response) => (response.ok ? response.json() : { notes: [] }))
      .then((body: { notes: Note[] }) => {
        if (!cancelled) setNotes(body.notes);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [listUrl]);

  // Prefilled from the case and the reviewer until the officer types their own.
  const topicValue = topic ?? defaultTopic;
  const nameValue = name ?? author;

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (event) => chunks.current.push(event.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        const ext = (rec.mimeType || "audio/webm").includes("mp4") ? "mp4" : "webm";
        const form = new FormData();
        form.append("audio", blob, `notitie.${ext}`);
        setBusy("Omzetten naar tekst…");
        try {
          const response = await fetch("/api/voice", { method: "POST", body: form });
          const body = (await response.json()) as { text: string } | ApiError;
          if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Omzetten mislukt");
          setText((current) => (current ? `${current} ${body.text}` : body.text));
          setDictated(true);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Omzetten mislukt");
        } finally {
          setBusy(null);
        }
      };
      rec.start();
      recorder.current = rec;
      setRecording(true);
    } catch {
      setError("Geen toegang tot de microfoon. Typ de notitie.");
    }
  };

  const stopRecording = () => {
    recorder.current?.stop();
    recorder.current = null;
    setRecording(false);
  };

  const save = async () => {
    setBusy("Opslaan…");
    setError(null);
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicValue, text, author: nameValue, dictated }),
      });
      const body = (await response.json()) as { note: Note } | ApiError;
      if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Opslaan mislukt");
      setText("");
      setDictated(false);
      setNotes((current) => [body.note, ...current.filter((n) => n.id !== body.note.id)]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Opslaan mislukt");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="panel notes-panel" aria-labelledby="notes-heading">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Kennis van collega&apos;s</p>
          <h2 id="notes-heading">{question ? "Notities bij deze vraag" : "Notities"}</h2>
        </div>
        <span className="count">{notes.length}</span>
      </div>
      <p className="hint">Notitie medewerker — niet geverifieerd. Notities zijn geen bewijs en gaan niet naar de AI.</p>

      {notes.length ? (
        <ul className="notes-list">
          {notes.map((note) => (
            <li key={note.id}>
              <strong>{note.topic}</strong>
              <p>{note.text}</p>
              <span className="muted">
                {note.author} · {new Date(note.created_at).toLocaleDateString("nl-BE")}
                {note.dictated ? " · ingesproken" : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{question ? "Geen notities die bij deze vraag passen." : "Nog geen notities."}</p>
      )}

      <div className="inline-form notes-form">
        <label>
          Onderwerp
          <input value={topicValue} onChange={(event) => setTopic(event.target.value)} placeholder="Bijvoorbeeld: marktstandplaats" />
        </label>
        <label>
          Notitie
          <textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder="Typ of spreek in. Je kan de tekst altijd aanpassen." />
        </label>
        <label>
          Naam medewerker
          <input value={nameValue} onChange={(event) => setName(event.target.value)} />
        </label>
        {error ? <div className="error-banner" role="alert">{error}</div> : null}
        <div className="button-row">
          <button
            type="button"
            className={`button button-small ${recording ? "button-danger" : "button-secondary"}`}
            onClick={recording ? stopRecording : startRecording}
            disabled={!!busy}
          >
            {recording ? "■ Stop opname" : "● Inspreken"}
          </button>
          <button type="button" className="button button-small button-primary" onClick={save} disabled={!!busy || recording || !topicValue.trim() || !text.trim() || !nameValue.trim()}>
            {busy ?? "Opslaan als notitie"}
          </button>
        </div>
      </div>
    </section>
  );
}
