import type { Casus, Fact } from "@/lib/types";

type Props = {
  casus: Casus;
  disabled?: boolean;
  onCasusChange: (casus: Casus) => void;
  onFactsChange: (facts: Fact[]) => void;
  onRerun: () => void;
};

export function CaseCard({ casus, disabled, onCasusChange, onFactsChange, onRerun }: Props) {
  const setFact = (id: string, answer: Fact["answer"]) => {
    onFactsChange(casus.facts.map((fact) => (
      fact.id === id ? { ...fact, answer, set_by: "officer" as const } : fact
    )));
  };

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
        <h3>Subquestions</h3>
        <ul className="compact-list">
          {casus.subquestions.map((question) => <li key={question}>{question}</li>)}
        </ul>
      </div>

      <div className="case-section">
        <h3>Facts</h3>
        {casus.facts.length === 0 ? <p className="muted">No additional facts identified.</p> : null}
        {casus.facts.map((fact) => (
          <fieldset className="fact" key={fact.id} disabled={disabled}>
            <legend>{fact.question}</legend>
            <div className="segmented">
              {(["ja", "nee", "onbekend"] as const).map((answer) => (
                <button
                  key={answer}
                  type="button"
                  className={fact.answer === answer ? "active" : ""}
                  aria-pressed={fact.answer === answer}
                  onClick={() => setFact(fact.id, answer)}
                >
                  {answer === "onbekend" ? "Unknown" : answer === "ja" ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <button type="button" className="button button-secondary full" onClick={onRerun} disabled={disabled}>
        Reanalyse case
      </button>
      <p className="hint">Reanalysis uses the updated date and activity. Unknown facts remain unknown.</p>
    </section>
  );
}
