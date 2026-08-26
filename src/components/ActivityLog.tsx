import type { ActivityEntry } from "../webmcp/activityLog";

type Props = {
  entries: ActivityEntry[];
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function ActivityLog({ entries }: Props) {
  const newestFirst = [...entries].reverse();

  return (
    <section aria-label="Agent activity log">
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Activity log</h2>
      {newestFirst.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No tool calls yet.</p>
      ) : (
        <ol className="mt-3 grid gap-2">
          {newestFirst.map((entry) => (
            <li key={entry.id} className="border border-line p-2 text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <code className="font-bold">{entry.name}</code>
                <time dateTime={new Date(entry.timestamp).toISOString()}>{formatTime(entry.timestamp)}</time>
              </div>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] text-muted">
                {JSON.stringify({ arguments: entry.arguments, outcome: entry.outcome })}
              </pre>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
