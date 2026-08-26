export type ActivityEntry = {
  id: number;
  name: string;
  arguments: Record<string, unknown>;
  timestamp: number;
  outcome: unknown;
};

type Listener = () => void;

let nextId = 1;
let entries: ActivityEntry[] = [];
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener();
}

export const activityLog = {
  subscribe(cb: Listener): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  getSnapshot(): ActivityEntry[] {
    return entries;
  },
  append(entry: Omit<ActivityEntry, "id">): void {
    const full: ActivityEntry = { id: nextId++, ...entry };
    entries = [...entries, full];
    emit();
  },
  // test-only
  reset(): void {
    nextId = 1;
    entries = [];
    emit();
  },
};
