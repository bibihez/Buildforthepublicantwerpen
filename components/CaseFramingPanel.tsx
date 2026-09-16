"use client";

import { ArrowRight, Check, ListChecks, Plus, Trash } from "@phosphor-icons/react";
import type { Casus, Fact } from "@/lib/types";
import { initialCaseFacts } from "@/lib/case-facts";

type Props = {
  casus: Casus;
  disabled?: boolean;
  onChange: (casus: Casus) => void;
  onConfirm: () => void;
};

const answerLabel = (answer: Fact["answer"]) => (
  answer === "ja" ? "Yes" : answer === "nee" ? "No" : "Unknown"
);

export function CaseFramingPanel({ casus, disabled, onChange, onConfirm }: Props) {
  const visibleFacts = initialCaseFacts(casus.facts);
  const valid = Boolean(
    casus.municipality.trim()
    && casus.date
    && casus.activity.trim()
    && casus.subquestions.some((question) => question.trim()),
  );

  const updateQuestion = (index: number, value: string) => {
    onChange({
      ...casus,
      subquestions: casus.subquestions.map((question, current) => current === index ? value : question),
    });
  };

  const removeQuestion = (index: number) => {
    onChange({ ...casus, subquestions: casus.subquestions.filter((_, current) => current !== index) });
  };

  const setFact = (id: string, answer: Fact["answer"]) => {
    onChange({
      ...casus,
      facts: visibleFacts.map((fact) => fact.id === id ? { ...fact, answer, set_by: "officer" as const } : fact),
    });
  };

  return (
    <section className="panel case-framing" aria-labelledby="case-framing-heading">
      <div className="case-framing-header">
        <div>
          <p className="eyebrow">Suggested framing</p>
          <h2 id="case-framing-heading">Confirm the research brief</h2>
          <p>Bronwijzer has reconstructed the case. Correct the framing before any source research starts.</p>
        </div>
        <span className="badge badge-warning">Awaiting confirmation</span>
      </div>

      <div className="case-field-grid">
        <label>
          Territory or municipality
          <input
            value={casus.municipality}
            disabled={disabled}
            onChange={(event) => onChange({ ...casus, municipality: event.target.value })}
          />
        </label>
        <label>
          Relevant date
          <input
            type="date"
            value={casus.date}
            disabled={disabled}
            onChange={(event) => onChange({ ...casus, date: event.target.value })}
          />
        </label>
        <label className="case-activity-field">
          Activity
          <input
            value={casus.activity}
            disabled={disabled}
            onChange={(event) => onChange({ ...casus, activity: event.target.value })}
          />
        </label>
      </div>

      {visibleFacts.length ? (
        <div className="case-framing-section">
          <div className="case-framing-section-heading">
            <div>
              <h3>Operational details</h3>
              <p>Confirm or correct these three questions. The same set remains editable after research.</p>
            </div>
            <ListChecks aria-hidden="true" weight="duotone" />
          </div>
          <div className="framing-facts">
            {visibleFacts.map((fact) => (
              <fieldset className="fact framing-fact" disabled={disabled} key={fact.id}>
                <legend>{fact.question}</legend>
                <span className={`fact-provenance fact-provenance-${fact.set_by}`}>
                  {fact.set_by === "officer" ? "Confirmed by you" : fact.origin === "source_condition" ? "Suggested by a source condition" : "From the question"}
                </span>
                <div className="segmented">
                  {(["ja", "nee", "onbekend"] as const).map((answer) => {
                    const selected = fact.answer === answer;
                    const confirmed = selected && fact.set_by === "officer";
                    return (
                      <button
                        type="button"
                        key={answer}
                        aria-pressed={selected}
                        className={confirmed ? "active" : selected ? "suggested" : ""}
                        onClick={() => setFact(fact.id, answer)}
                      >
                        {confirmed ? <Check aria-hidden="true" weight="bold" /> : null}
                        {answerLabel(answer)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </div>
      ) : null}

      <div className="case-framing-section">
        <div className="case-framing-section-heading">
          <div>
            <h3>Proposed research questions</h3>
            <p>These questions define what Bronwijzer will search in the approved source library.</p>
          </div>
        </div>
        <ol className="framing-question-list">
          {casus.subquestions.map((question, index) => (
            <li key={index}>
              <span className="framing-question-number" aria-hidden="true">{index + 1}</span>
              <label className="sr-only" htmlFor={`research-question-${index}`}>Research question {index + 1}</label>
              <textarea
                id={`research-question-${index}`}
                rows={2}
                value={question}
                disabled={disabled}
                onChange={(event) => updateQuestion(index, event.target.value)}
              />
              <button
                type="button"
                className="icon-button"
                disabled={disabled}
                onClick={() => removeQuestion(index)}
                aria-label={`Remove research question ${index + 1}`}
              >
                <Trash aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="button button-quiet add-question"
          disabled={disabled}
          onClick={() => onChange({ ...casus, subquestions: [...casus.subquestions, ""] })}
        >
          <Plus aria-hidden="true" weight="bold" /> Add question
        </button>
      </div>

      {!valid ? (
        <p className="case-validation" role="alert">
          Add a territory, date, activity and at least one research question before continuing.
        </p>
      ) : null}

      <div className="case-framing-actions">
        <p>Source research starts only after your confirmation.</p>
        <button type="button" className="button button-primary" disabled={disabled || !valid} onClick={onConfirm}>
          Confirm and research <ArrowRight aria-hidden="true" weight="bold" />
        </button>
      </div>
    </section>
  );
}
