import type { Finding } from "@/lib/types";

const statusLabels: Record<Finding["status"], string> = {
  citaat_gecontroleerd: "Quote verified",
  onzeker: "Uncertain",
  tegenstrijdig: "Conflicting passages",
};

const reviewLabels: Record<Exclude<Finding["review"], "open">, string> = {
  bevestigd: "Confirmed by officer",
  gecorrigeerd: "Corrected",
  verworpen: "Rejected",
};

export function StatusBadge({ finding }: { finding: Finding }) {
  if (finding.review === "gecorrigeerd") {
    return <span className="badge badge-warning">Text changed—not covered by quote</span>;
  }
  if (finding.review !== "open") {
    return <span className={`badge badge-${finding.review}`}>{reviewLabels[finding.review]}</span>;
  }
  return <span className={`badge badge-${finding.status}`}>{statusLabels[finding.status]}</span>;
}

export function NotFoundBadge() {
  return <span className="badge badge-not-found">Not found in available sources</span>;
}
