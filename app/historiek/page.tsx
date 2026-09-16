import Link from "next/link";

import { HistoryList } from "@/components/history/HistoryList";
import styles from "./history.module.css";

export default function HistoryPage() {
  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Bronwijzer</p>
          <h1>Answer history</h1>
          <p className={styles.intro}>
            Review draft and approved answers. An approved answer always opens
            the saved snapshot of that specific version.
          </p>
        </div>
        <Link className={styles.secondaryLink} href="/">
          Back to workspace
        </Link>
      </header>

      <HistoryList />
    </main>
  );
}
