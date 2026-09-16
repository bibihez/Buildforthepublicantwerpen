"use client";

import { useEffect, useRef, useState } from "react";
import { Microphone, NotePencil, Stop } from "@phosphor-icons/react";
import type { ApiError, Note } from "@/lib/types";

type Props = {
  /** With a question: only related notes. Without: all notes (Notes page). */
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
  const [debouncedQuestion, setDebouncedQuestion] = useState(question?.trim() ?? "");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuestion(question?.trim() ?? ""), 400);
    return () => window.clearTimeout(timer);
  }, [question]);

  const listUrl = debouncedQuestion ? `/api/notes?q=${encodeURIComponent(debouncedQuestion)}` : "/api/notes";
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
        setBusy("Transcribing…");
        try {
          const response = await fetch("/api/voice", { method: "POST", body: form });
          const body = (await response.json()) as { text: string } | ApiError;
          if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Transcription failed");
          setText((current) => (current ? `${current} ${body.text}` : body.text));
          setDictated(true);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Transcription failed");
        } finally {
          setBusy(null);
        }
      };
      rec.start();
      recorder.current = rec;
      setRecording(true);
    } catch {
      setError("Microphone access is unavailable. Type the note instead.");
    }
  };

  const stopRecording = () => {
    recorder.current?.stop();
    recorder.current = null;
    setRecording(false);
  };

  const save = async () => {
    setBusy("Saving…");
    setError(null);
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topicValue, text, author: nameValue, dictated }),
      });
      const body = (await response.json()) as { note: Note } | ApiError;
      if (!response.ok || "error" in body) throw new Error("error" in body ? body.error : "Save failed");
      setText("");
      setDictated(false);
      setNotes((current) => [body.note, ...current.filter((n) => n.id !== body.note.id)]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="panel notes-panel" aria-labelledby="notes-heading">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Colleague knowledge</p>
          <h2 id="notes-heading">{question ? "Notes for this question" : "Notes"}</h2>
        </div>
        <span className="count">{notes.length}</span>
      </div>
      <p className="hint">Officer knowledge. Not verified, not evidence and never sent to the AI.</p>

      {notes.length ? (
        <ul className="notes-list">
          {notes.map((note) => (
            <li key={note.id}>
              <strong>{note.topic}</strong>
              <p>{note.text}</p>
              <span className="muted">
                {note.author}, {new Date(note.created_at).toLocaleDateString("en-GB")}
                {note.dictated ? ", dictated" : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{question ? "No notes match this question." : "No notes yet."}</p>
      )}

      <details className="notes-composer" open={!question}>
        <summary><NotePencil aria-hidden="true" /> Add colleague note</summary>
      <div className="inline-form notes-form">
        <label>
          Topic
          <input value={topicValue} onChange={(event) => setTopic(event.target.value)} placeholder="For example: market pitch" />
        </label>
        <label>
          Note
          <textarea rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder="Type or dictate. You can always edit the text." />
        </label>
        <label>
          Officer name
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
            {recording ? <><Stop aria-hidden="true" weight="fill" /> Stop recording</> : <><Microphone aria-hidden="true" /> Dictate</>}
          </button>
          <button type="button" className="button button-small button-primary" onClick={save} disabled={!!busy || recording || !topicValue.trim() || !text.trim() || !nameValue.trim()}>
            {busy ?? "Save as note"}
          </button>
        </div>
      </div>
      </details>
    </section>
  );
}
