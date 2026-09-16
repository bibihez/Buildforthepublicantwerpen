import { NotesPanel } from "@/components/NotesPanel";

export default function NotitiesPage() {
  return (
    <main className="workspace">
      <section className="intro-row">
        <div>
          <p className="eyebrow">Kennis van collega&apos;s</p>
          <h1>Notities</h1>
          <p>Praktische kennis van medewerkers. Nooit bewijs: een antwoord steunt alleen op officiële bronnen.</p>
        </div>
      </section>
      <NotesPanel />
    </main>
  );
}
