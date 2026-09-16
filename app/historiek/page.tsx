import Link from "next/link";

import { HistoryList } from "@/components/history/HistoryList";
import styles from "./history.module.css";

export default function HistoryPage() {
  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Bronwijzer</p>
          <h1>Historiek</h1>
          <p className={styles.intro}>
            Bekijk concepten en goedgekeurde antwoorden. Een goedgekeurd antwoord
            opent altijd de bewaarde momentopname van die specifieke versie.
          </p>
        </div>
        <Link className={styles.secondaryLink} href="/">
          Terug naar werkruimte
        </Link>
      </header>

      <HistoryList />
    </main>
  );
}
