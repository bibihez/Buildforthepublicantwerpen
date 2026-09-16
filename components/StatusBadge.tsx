import type { Finding } from "@/lib/types";

const statusLabels: Record<Finding["status"], string> = {
  citaat_gecontroleerd: "Citaat gecontroleerd",
  onzeker: "Onzeker",
  tegenstrijdig: "Tegenstrijdige passages",
};

const reviewLabels: Record<Exclude<Finding["review"], "open">, string> = {
  bevestigd: "Bevestigd door medewerker",
  gecorrigeerd: "Gecorrigeerd",
  verworpen: "Verworpen",
};

export function StatusBadge({ finding }: { finding: Finding }) {
  if (finding.review === "gecorrigeerd") {
    return <span className="badge badge-warning">Tekst gewijzigd — niet gedekt door citaat</span>;
  }
  if (finding.review !== "open") {
    return <span className={`badge badge-${finding.review}`}>{reviewLabels[finding.review]}</span>;
  }
  return <span className={`badge badge-${finding.status}`}>{statusLabels[finding.status]}</span>;
}

export function NotFoundBadge() {
  return <span className="badge badge-not-found">Niet gevonden in beschikbare bronnen</span>;
}
