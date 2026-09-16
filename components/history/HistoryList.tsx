"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Answer, ApiError } from "@/lib/types";
import styles from "@/app/historiek/history.module.css";

type HistoryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; answers: Answer[] };

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Brussels",
});

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

async function errorMessage(response: Response) {
  const fallback = `Answer history could not be loaded (${response.status}).`;

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
          throw new Error("The server returned invalid answer history data.");
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
              : "Answer history could not be loaded.",
        });
      }
    }

    void loadAnswers();
    return () => controller.abort();
  }, []);

  if (state.status === "loading") {
    return (
      <div className={styles.stateBox} role="status">
        <strong>Loading answer history…</strong>
        Retrieving saved answers.
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className={`${styles.stateBox} ${styles.errorBox}`} role="alert">
        <strong>Answer history unavailable</strong>
        {state.message}
      </div>
    );
  }

  if (state.answers.length === 0) {
    return (
      <div className={styles.stateBox}>
        <strong>No answers yet</strong>
        Once a question has been analysed, its version will appear here.
      </div>
    );
  }

  return (
    <section className={styles.panel} aria-label="Answer history">
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Question</th>
              <th scope="col">Status</th>
              <th scope="col">Approved by</th>
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
                      {approved ? "Approved" : "Draft"}
                    </span>
                  </td>
                  <td>{answer.approved_by || "Not approved"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
