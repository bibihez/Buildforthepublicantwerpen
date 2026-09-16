"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type {
  AnswerResponse,
  ApiError,
  Finding,
  Snapshot,
} from "@/lib/types";
import styles from "@/app/historiek/history.module.css";

type DetailState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; response: AnswerResponse };

type ActionState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "error"; message: string; blockers: string[] }
  | { status: "success"; answerId: string };

const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Brussels",
});

const shortDateFormatter = new Intl.DateTimeFormat("nl-BE", {
  dateStyle: "long",
  timeZone: "Europe/Brussels",
});

function formatDate(value: string, includeTime = true) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return includeTime
    ? dateFormatter.format(date)
    : shortDateFormatter.format(date);
}

function reviewLabel(review: Finding["review"]) {
  switch (review) {
    case "bevestigd":
      return "Bevestigd door medewerker";
    case "gecorrigeerd":
      return "Gecorrigeerd";
    case "verworpen":
      return "Verworpen";
    default:
      return "Open";
  }
}

function statusLabel(status: Finding["status"]) {
  switch (status) {
    case "citaat_gecontroleerd":
      return "Citaat gecontroleerd";
    case "tegenstrijdig":
      return "Tegenstrijdige passages";
    default:
      return "Onzeker";
  }
}

function factLabel(answer: Snapshot["casus"]["facts"][number]["answer"]) {
  return answer === "ja" ? "Ja" : answer === "nee" ? "Nee" : "Onbekend";
}

function decisionLabel(decision: Finding["conflict_decision"]) {
  switch (decision) {
    case "deze":
      return "Deze passage gekozen";
    case "andere":
      return "Andere passage gekozen";
    case "onzeker_vermelden":
      return "Als onzeker vermeld";
    case "weglaten":
      return "Weggelaten";
    default:
      return "Geen beslissing bewaard";
  }
}

async function readApiError(response: Response) {
  const fallback = `De aanvraag is mislukt (${response.status}).`;

  try {
    const body = (await response.json()) as Partial<ApiError>;
    return {
      message: body.error || fallback,
      blockers: body.blockers?.map((blocker) => blocker.message) ?? [],
    };
  } catch {
    return { message: fallback, blockers: [] };
  }
}

export function HistoryDetail({ answerId }: { answerId: string }) {
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [action, setAction] = useState<ActionState>({ status: "idle" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnswer() {
      try {
        const response = await fetch(
          `/api/answers/${encodeURIComponent(answerId)}`,
          { cache: "no-store", signal: controller.signal },
        );

        if (!response.ok) {
          const apiError = await readApiError(response);
          throw new Error(apiError.message);
        }

        const data = (await response.json()) as AnswerResponse;
        if (!data?.answer?.id) {
          throw new Error("De server gaf geen geldig antwoord terug.");
        }
        setState({ status: "ready", response: data });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Het antwoord kon niet worden geladen.",
        });
      }
    }

    void loadAnswer();
    return () => controller.abort();
  }, [answerId]);

  const snapshot =
    state.status === "ready" && state.response.answer.status === "goedgekeurd"
      ? state.response.answer.snapshot ?? null
      : null;

  const sourceById = useMemo(
    () => new Map(snapshot?.sources.map((source) => [source.id, source]) ?? []),
    [snapshot],
  );
  const passageById = useMemo(
    () =>
      new Map(snapshot?.passages.map((passage) => [passage.id, passage]) ?? []),
    [snapshot],
  );
  const verdictBySource = useMemo(
    () =>
      new Map(
        snapshot?.verdicts.map((verdict) => [verdict.source_id, verdict]) ?? [],
      ),
    [snapshot],
  );

  async function createNewVersion() {
    setAction({ status: "saving" });

    try {
      const response = await fetch(
        `/api/answers/${encodeURIComponent(answerId)}/new-version`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      if (!response.ok) {
        const error = await readApiError(response);
        setAction({ status: "error", ...error });
        return;
      }

      const data = (await response.json()) as AnswerResponse;
      if (!data?.answer?.id) {
        throw new Error("De server gaf geen geldige nieuwe versie terug.");
      }
      setAction({ status: "success", answerId: data.answer.id });
    } catch (error) {
      setAction({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "De nieuwe versie kon niet worden gemaakt.",
        blockers: [],
      });
    }
  }

  if (state.status === "loading") {
    return (
      <main className={styles.page}>
        <div className={styles.stateBox} role="status">
          <strong>Momentopname laden…</strong>
          Het goedgekeurde antwoord wordt opgehaald.
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className={styles.page}>
        <div className={`${styles.stateBox} ${styles.errorBox}`} role="alert">
          <strong>Antwoord niet beschikbaar</strong>
          {state.message}
        </div>
        <div className={styles.actionRow}>
          <Link className={styles.secondaryLink} href="/historiek">
            Terug naar historiek
          </Link>
        </div>
      </main>
    );
  }

  if (!snapshot) {
    const isDraft = state.response.answer.status === "concept";
    return (
      <main className={styles.page}>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Historiek</p>
            <h1>{isDraft ? "Conceptversie" : "Geen momentopname"}</h1>
          </div>
          <Link className={styles.secondaryLink} href="/historiek">
            Terug naar historiek
          </Link>
        </header>
        <div className={`${styles.stateBox} ${styles.warningBox}`} role="status">
          <strong>
            {isDraft
              ? "Deze versie is nog niet goedgekeurd."
              : "De goedgekeurde momentopname ontbreekt."}
          </strong>
          {isDraft
            ? "Historiek toont alleen de bewaarde inhoud van goedgekeurde versies. Open het concept in de werkruimte om verder te gaan."
            : "De actuele antwoordgegevens worden bewust niet als vervanging getoond. Zo blijft de historiek controleerbaar."}
        </div>
        {isDraft ? (
          <div className={styles.actionRow}>
            <p className={styles.actionInfo}>
              Concept {state.response.answer.id}, revisie {state.response.answer.revision}
            </p>
            <Link
              className={styles.primaryLink}
              href={`/?answer=${encodeURIComponent(state.response.answer.id)}`}
            >
              Open concept in werkruimte
            </Link>
          </div>
        ) : null}
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.detailHeader}>
        <div className={styles.headerTopline}>
          <div>
            <p className={styles.eyebrow}>Goedgekeurd antwoord</p>
            <h1>{snapshot.casus.question}</h1>
          </div>
          <Link className={styles.secondaryLink} href="/historiek">
            Terug naar historiek
          </Link>
        </div>
        <p className={styles.snapshotNotice}>
          Dit is de onveranderlijke momentopname van revisie {snapshot.revision},
          bewaard bij goedkeuring. Huidige brongegevens worden hier niet gebruikt.
        </p>
        <dl className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <dt>Goedgekeurd door</dt>
            <dd>{snapshot.approved_by}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt>Goedgekeurd op</dt>
            <dd>{formatDate(snapshot.approved_at)}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt>Momentopname</dt>
            <dd>{formatDate(snapshot.taken_at)}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt>Versie</dt>
            <dd>Revisie {snapshot.revision}</dd>
          </div>
        </dl>
      </header>

      <section className={styles.section}>
        <h2>Casus</h2>
        <dl className={styles.caseGrid}>
          <div className={styles.caseItem}>
            <dt>Gemeente</dt>
            <dd>{snapshot.casus.municipality}</dd>
          </div>
          <div className={styles.caseItem}>
            <dt>Casusdatum</dt>
            <dd>{formatDate(snapshot.casus.date, false)}</dd>
          </div>
          <div className={styles.caseItem}>
            <dt>Activiteit</dt>
            <dd>{snapshot.casus.activity || "Niet ingevuld"}</dd>
          </div>
        </dl>

        {snapshot.casus.facts.length > 0 ? (
          <ul className={styles.factList} aria-label="Casusfeiten">
            {snapshot.casus.facts.map((fact) => (
              <li key={fact.id}>
                <span>{fact.question}</span>
                <span className={styles.valueLabel}>{factLabel(fact.answer)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className={styles.section}>
        <h2>Bevindingen en beoordeling</h2>
        <p className={styles.sectionLead}>
          De teksten, citaten en beoordelingen hieronder komen uitsluitend uit de
          goedgekeurde momentopname.
        </p>
        {snapshot.findings.length === 0 ? (
          <p>In deze versie zijn geen bevindingen bewaard.</p>
        ) : (
          <ol className={styles.findingList}>
            {snapshot.findings.map((finding) => (
              <li className={styles.findingCard} key={finding.id}>
                <div className={styles.findingMain}>
                  <div className={styles.findingTopline}>
                    <div>
                      <p className={styles.subquestion}>{finding.subquestion}</p>
                      <p className={styles.statement}>
                        {finding.review === "gecorrigeerd"
                          ? finding.corrected_statement || finding.statement
                          : finding.statement}
                      </p>
                    </div>
                    <span
                      className={`${styles.reviewBadge} ${
                        finding.review === "open" ? styles.reviewOpen : ""
                      } ${
                        finding.review === "verworpen"
                          ? styles.reviewRejected
                          : ""
                      }`}
                    >
                      {reviewLabel(finding.review)}
                    </span>
                  </div>

                  {finding.review === "gecorrigeerd" ? (
                    <p className={styles.originalStatement}>
                      Oorspronkelijke bevinding: {finding.statement}
                    </p>
                  ) : null}

                  <p className={styles.detailLine}>
                    Automatische status: {statusLabel(finding.status)}
                    {finding.bulk ? " · in bulk bevestigd" : ""}
                  </p>

                  {finding.status_reasons.length > 0 ? (
                    <ul className={styles.reasonList}>
                      {finding.status_reasons.map((reason, index) => (
                        <li key={`${finding.id}-status-${index}`}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}

                  {finding.condition ? (
                    <p className={styles.detailLine}>
                      <strong>Voorwaarde:</strong> {finding.condition.quote}
                      {!finding.condition.quote_checked
                        ? " — tekst niet door citaatcontrole bevestigd"
                        : ""}
                    </p>
                  ) : null}

                  {finding.review_reason ? (
                    <p className={styles.detailLine}>
                      <strong>Reden beoordeling:</strong> {finding.review_reason}
                    </p>
                  ) : null}

                  {finding.reviewed_by || finding.reviewed_at ? (
                    <p className={styles.detailLine}>
                      Beoordeeld door {finding.reviewed_by || "onbekend"}
                      {finding.reviewed_at
                        ? ` op ${formatDate(finding.reviewed_at)}`
                        : ""}
                    </p>
                  ) : null}

                  {finding.status === "tegenstrijdig" ? (
                    <p className={styles.detailLine}>
                      <strong>Beslissing bij conflict:</strong>{" "}
                      {decisionLabel(finding.conflict_decision)}
                      {finding.conflict_reason
                        ? ` — ${finding.conflict_reason}`
                        : ""}
                    </p>
                  ) : null}
                </div>

                {finding.citations.length > 0 ? (
                  <ul className={styles.citationList} aria-label="Citaten">
                    {finding.citations.map((citation, index) => {
                      const passage = passageById.get(citation.passage_id);
                      const source = passage
                        ? sourceById.get(passage.source_id)
                        : undefined;
                      return (
                        <li
                          className={styles.citation}
                          key={`${citation.passage_id}-${index}`}
                        >
                          <h3>{source?.short_title || "Bron in momentopname"}</h3>
                          <p className={styles.sourceMeta}>
                            {passage?.article || "Geen artikel vermeld"}
                            {passage
                              ? ` · p. ${passage.page_from}${
                                  passage.page_to !== passage.page_from
                                    ? `–${passage.page_to}`
                                    : ""
                                }`
                              : ""}
                          </p>
                          <blockquote className={styles.quote}>
                            “{citation.quote}”
                          </blockquote>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {snapshot.not_found.length > 0 ? (
        <section className={styles.section}>
          <h2>Niet gevonden in beschikbare bronnen</h2>
          <ul className={styles.missingList}>
            {snapshot.not_found.map((item) => (
              <li key={item.subquestion}>
                <span>{item.subquestion}</span>
                <span className={styles.valueLabel}>
                  {item.decision === "vermelden"
                    ? "Vermeld"
                    : item.decision === "weglaten"
                      ? "Weggelaten"
                      : "Geen beslissing"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.section}>
        <h2>Bronversies</h2>
        <p className={styles.sectionLead}>
          Vastgelegde versies en broncontroles op het moment van goedkeuring.
        </p>
        {snapshot.sources.length === 0 ? (
          <p>Geen bronversies bewaard.</p>
        ) : (
          <div className={styles.sourceGrid}>
            {snapshot.sources.map((source) => {
              const verdict = verdictBySource.get(source.id);
              return (
                <article className={styles.sourceCard} key={source.id}>
                  <div className={styles.cardTopline}>
                    <h3>{source.title}</h3>
                    <span className={styles.hash}>
                      {source.sha256 ? source.sha256.slice(0, 8) : "geen hash"}
                    </span>
                  </div>
                  <p className={styles.sourceMeta}>
                    {source.short_title} · {source.level} · {source.nature} ·{" "}
                    {source.territory}
                  </p>
                  <p className={styles.detailLine}>
                    Broncontrole: {verdict?.verdict || "niet bewaard"}
                  </p>
                  {verdict?.reasons.length ? (
                    <ul className={styles.reasonList}>
                      {verdict.reasons.map((reason, index) => (
                        <li key={`${source.id}-reason-${index}`}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2>Goedgekeurd antwoord</h2>
        <pre className={styles.reply}>{snapshot.reply_text || "Geen antwoordtekst bewaard."}</pre>
      </section>

      {action.status === "error" ? (
        <div className={`${styles.inlineMessage} ${styles.errorBox}`} role="alert">
          <strong>Nieuwe versie niet gemaakt</strong>
          {action.message}
          {action.blockers.length > 0 ? (
            <ul className={styles.errorList}>
              {action.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {action.status === "success" ? (
        <div className={`${styles.inlineMessage} ${styles.successBox}`} role="status">
          <strong>Nieuwe conceptversie gemaakt</strong>
          De goedgekeurde versie blijft ongewijzigd. Het nieuwe concept kan nu in
          de werkruimte worden beoordeeld.
        </div>
      ) : null}

      <div className={styles.actionRow}>
        <p className={styles.actionInfo}>
          Vorige antwoorden zijn context, geen bewijs. Een nieuwe versie hergebruikt
          nooit automatisch goedgekeurde tekst.
        </p>
        {action.status === "success" ? (
          <Link
            className={styles.primaryLink}
            href={`/?answer=${encodeURIComponent(action.answerId)}`}
          >
            Open nieuwe conceptversie
          </Link>
        ) : (
          <button
            className={styles.actionButton}
            disabled={action.status === "saving"}
            onClick={() => void createNewVersion()}
            type="button"
          >
            {action.status === "saving"
              ? "Nieuwe versie maken…"
              : "Maak nieuwe versie"}
          </button>
        )}
      </div>
    </main>
  );
}
