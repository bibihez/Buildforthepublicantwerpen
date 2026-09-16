import type { SourceEvent } from "@/lib/types";

const eventLabels: Record<SourceEvent["type"], string> = {
  toegevoegd: "Toegevoegd",
  gewijzigd: "Gewijzigd",
  vervangen: "Vervangen",
  gedeactiveerd: "Gedeactiveerd",
  geactiveerd: "Geactiveerd",
};

const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatEventDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

type SourceEventsProps = {
  events: SourceEvent[];
};

export function SourceEvents({ events }: SourceEventsProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-500">Voor deze bron zijn nog geen gebeurtenissen geregistreerd.</p>
    );
  }

  const sortedEvents = [...events].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <ol className="grid gap-3" aria-label="Gebeurtenissen van deze bron">
      {sortedEvents.map((event) => (
        <li
          className="grid gap-1 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[10rem_1fr]"
          key={event.id}
        >
          <time className="text-xs font-medium text-slate-500" dateTime={event.at}>
            {formatEventDate(event.at)}
          </time>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {eventLabels[event.type]} <span className="font-normal text-slate-500">door {event.by}</span>
            </p>
            {event.reason ? <p className="mt-1 text-sm text-slate-600">{event.reason}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
