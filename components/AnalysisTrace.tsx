import type { AnswerResponse } from "@/lib/types";

const steps = [
  {
    title: "Understand the request",
    detail: "Identify the activity, subquestions and facts that can change which rules apply.",
  },
  {
    title: "Search official sources",
    detail: "Search the indexed source library for procedures, required documents, fees and conditions.",
  },
  {
    title: "Verify the evidence",
    detail: "Keep only findings backed by an exact source quote and checked source metadata.",
  },
] as const;

type Props = {
  question: string;
  running: boolean;
  activeStep: number;
  data: AnswerResponse | null;
};

export function AnalysisTrace({ question, running, activeStep, data }: Props) {
  const settledData = !running && data?.answer.casus.question === question.trim() ? data : null;
  if (!running && !settledData) return null;

  const complete = Boolean(settledData);
  const sourceCount = settledData ? Object.keys(settledData.sources).length : null;
  const passageCount = settledData?.answer.candidates.length ?? null;

  return (
    <section className="panel analysis-trace" aria-labelledby="analysis-trace-heading" aria-live="polite">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">High-level search trace</p>
          <h2 id="analysis-trace-heading">{running ? "Building the evidence set" : "How this answer was built"}</h2>
        </div>
        <span className={`badge ${complete ? "badge-confirmed" : "badge-warning"}`}>
          {complete ? "Completed" : "In progress"}
        </span>
      </div>

      <p className="hint">
        This shows the auditable workflow and search scope, not private model reasoning.
      </p>

      <div className="trace-query">
        <strong>Question being searched</strong>
        <p>{question.trim()}</p>
      </div>

      <ol className="trace-steps">
        {steps.map((step, index) => {
          const state = complete || index < activeStep ? "complete" : index === activeStep ? "active" : "pending";
          return (
            <li className={`trace-step trace-step-${state}`} key={step.title}>
              <span className="trace-marker" aria-hidden="true">{state === "complete" ? "✓" : index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {settledData ? (
        <div className="trace-results">
          <div>
            <strong>Search targets</strong>
            <ul>{settledData.answer.casus.subquestions.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <p>
            <strong>Scope checked:</strong> {sourceCount} source documents · {passageCount} candidate passages
          </p>
        </div>
      ) : (
        <p className="trace-waiting">The extracted search targets will appear here when the analysis completes.</p>
      )}
    </section>
  );
}
