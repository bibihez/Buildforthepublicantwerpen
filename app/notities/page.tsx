import { NotesPanel } from "@/components/NotesPanel";

export default function NotesPage() {
  return (
    <main className="workspace">
      <section className="intro-row">
        <div>
          <p className="eyebrow">Colleague knowledge</p>
          <h1>Notes</h1>
          <p>Practical officer knowledge. Never evidence: an answer relies only on official sources.</p>
        </div>
      </section>
      <NotesPanel />
    </main>
  );
}
