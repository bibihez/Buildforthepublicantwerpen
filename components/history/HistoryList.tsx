"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Answer, ApiError } from "@/lib/types";
import styles from "@/app/historiek/history.module.css";

type HistoryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; answers: Answer[] };

const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Brussels",
});

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

async function errorMessage(response: Response) {
  const fallback = `Historiek kon niet worden geladen (${response.status}).`;

  try {
    const body = (await response.json()) as Partial<ApiError>;
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

export function HistoryList() {
  const [state, setState] = useState<HistoryState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnswers() {
      try {
        const response = await fetch("/api/answers", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(await errorMessage(response));
        }

        const data = (await response.json()) as { answers?: Answer[] };
        if (!Array.isArray(data.answers)) {
          throw new Error("De server gaf geen geldige antwoordhistoriek terug.");
        }

        const answers = [...data.answers].sort(
          (a, b) =>
            new Date(b.approved_at ?? b.created_at).getTime() -
            new Date(a.approved_at ?? a.created_at).getTime(),
        );
        setState({ status: "ready", answers });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Historiek kon niet worden geladen.",
        });
      }
    }

    void loadAnswers();
    return () => controller.abort();
  }, []);

  if (state.status === "loading") {
    return (
      <div className={styles.stateBox} role="status">
        <strong>Historiek laden…</strong>
        De bewaarde antwoorden worden opgehaald.
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className={`${styles.stateBox} ${styles.errorBox}`} role="alert">
        <strong>Historiek niet beschikbaar</strong>
        {state.message}
      </div>
    );
  }

  if (state.answers.length === 0) {
    return (
      <div className={styles.stateBox}>
        <strong>Nog geen antwoorden</strong>
        Zodra een vraag is geanalyseerd, verschijnt de versie hier.
      </div>
    );
  }

  return (
    <section className={styles.panel} aria-label="Antwoordhistoriek">
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Datum</th>
              <th scope="col">Vraag</th>
              <th scope="col">Status</th>
              <th scope="col">Goedgekeurd door</th>
            </tr>
          </thead>
          <tbody>
            {state.answers.map((answer) => {
              const approved = answer.status === "goedgekeurd";
              return (
                <tr key={answer.id}>
                  <td className={styles.dateCell}>
                    {formatDate(answer.approved_at ?? answer.created_at)}
                  </td>
                  <td>
                    <Link
                      className={styles.tableLink}
                      href={`/historiek/${encodeURIComponent(answer.id)}`}
                    >
                      {answer.casus.question}
                    </Link>
                  </td>
                  <td>
                    <span
                      className={`${styles.status} ${
                        approved ? styles.statusApproved : styles.statusDraft
                      }`}
                    >
                      {approved ? "Goedgekeurd" : "Concept"}
                    </span>
                  </td>
                  <td>{answer.approved_by || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
