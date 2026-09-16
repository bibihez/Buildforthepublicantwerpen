import type { Casus, Fact } from "@/lib/types";
import { initialCaseFacts } from "@/lib/case-facts";
import { Check, Sparkle } from "@phosphor-icons/react";

type Props = {
  casus: Casus;
  disabled?: boolean;
  onCasusChange: (casus: Casus) => void;
  onFactsChange: (facts: Fact[]) => void;
  onRerun: () => void;
};

export function CaseCard({ casus, disabled, onCasusChange, onFactsChange, onRerun }: Props) {
  const visibleFacts = initialCaseFacts(casus.facts);
  const setFact = (id: string, answer: Fact["answer"]) => {
    onFactsChange(visibleFacts.map((fact) => (
      fact.id === id ? { ...fact, answer, set_by: "officer" as const } : fact
    )));
  };

  const confirmedCount = visibleFacts.filter((fact) => fact.set_by === "officer").length;

  return (
    <section className="panel case-card" aria-labelledby="casus-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Case</p>
          <h2 id="casus-heading">Question details</h2>
        </div>
        <span className="municipality">Municipality of Schoten</span>
      </div>

      <label>
        Case date
        <input
          type="date"
          value={casus.date}
          disabled={disabled}
          onChange={(event) => onCasusChange({ ...casus, date: event.target.value })}
        />
      </label>
      <label>
        Activity
        <input
          value={casus.activity}
          disabled={disabled}
          onChange={(event) => onCasusChange({ ...casus, activity: event.target.value })}
        />
      </label>

      <div className="case-section">
        <div className="fact-section-heading">
          <div>
            <h3>Facts to confirm</h3>
            <p>The three facts from the confirmed brief stay fixed. You can still update them and reanalyse.</p>
          </div>
          {visibleFacts.length ? <span>{confirmedCount}/{visibleFacts.length} confirmed</span> : null}
        </div>
        {visibleFacts.length ? (
          <p className="fact-safety-note">
            <Sparkle aria-hidden="true" weight="fill" />
            AI suggestions are treated as Unknown until an officer confirms them.
          </p>
        ) : null}
        {visibleFacts.length === 0 ? <p className="muted">No additional facts identified.</p> : null}
        {visibleFacts.map((fact) => {
          const aiSuggestion = fact.set_by === "ai" && fact.answer !== "onbekend";
          const provenance = fact.set_by === "officer"
            ? "Confirmed by officer"
            : fact.origin === "source_condition"
              ? "Required by an official source condition"
              : aiSuggestion
                ? "Suggested from the entrepreneur's request"
                : "Needs officer input";

          return (
            <fieldset className="fact" key={fact.id} disabled={disabled}>
              <legend>{fact.question}</legend>
              <span className={`fact-provenance fact-provenance-${fact.set_by}`}>{provenance}</span>
              <div className="segmented">
                {(["ja", "nee", "onbekend"] as const).map((answer) => {
                  const selected = fact.answer === answer;
                  const confirmed = selected && fact.set_by === "officer";
                  return (
                    <button
                      key={answer}
                      type="button"
                      className={confirmed ? "active" : selected && fact.set_by === "ai" ? "suggested" : ""}
                      aria-pressed={selected}
                      onClick={() => setFact(fact.id, answer)}
                    >
                      {confirmed ? <Check aria-hidden="true" weight="bold" /> : null}
                      {answer === "onbekend" ? "Unknown" : answer === "ja" ? "Yes" : "No"}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>

      <button type="button" className="button button-secondary full" onClick={onRerun} disabled={disabled}>
        Reanalyse case
      </button>
      <p className="hint">Reanalysis uses the updated date, activity and officer-confirmed facts.</p>
    </section>
  );
}
