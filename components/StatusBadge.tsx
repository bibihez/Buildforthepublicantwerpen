import type { Finding } from "@/lib/types";
import { CheckCircle, MagnifyingGlass, Warning, WarningOctagon } from "@phosphor-icons/react";

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
    return <span className="badge status-badge badge-warning"><Warning aria-hidden="true" weight="fill" />Text changed, not covered by quote</span>;
  }
  if (finding.review !== "open") {
    return <span className={`badge status-badge badge-${finding.review}`}><CheckCircle aria-hidden="true" weight="fill" />{reviewLabels[finding.review]}</span>;
  }
  const Icon = finding.status === "citaat_gecontroleerd" ? CheckCircle : finding.status === "tegenstrijdig" ? WarningOctagon : Warning;
  return <span className={`badge status-badge badge-${finding.status}`}><Icon aria-hidden="true" weight="fill" />{statusLabels[finding.status]}</span>;
}

export function NotFoundBadge() {
  return <span className="badge status-badge badge-not-found"><MagnifyingGlass aria-hidden="true" weight="bold" />Not found in available sources</span>;
}
