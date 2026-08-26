import { useState } from "react";
import type { Mode } from "../game/types";
import type { ActivityEntry } from "../webmcp/activityLog";
import { ActivityLog } from "./ActivityLog";
import { HeaderMenu } from "./HeaderMenu";
import { ModeSwitch } from "./ModeSwitch";
import { Rules } from "./Rules";

const MODE_LABEL: Record<Mode, string> = {
  solo: "Observe",
  copilot: "Co-pilot",
  autonomous: "Auto",
};

type Props = {
  mode: Mode;
  entries: ActivityEntry[];
  onMode: (mode: Mode) => void;
  onNewGame: () => void;
};

export function Header({ mode, entries, onMode, onNewGame }: Props) {
  const [open, setOpen] = useState<"mode" | "log" | "rules" | null>(null);

  return (
    <header className="border-b border-line">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex flex-1 items-center gap-1.5">
          <HeaderMenu
            open={open === "mode"}
            label="Agent authority"
            badge={MODE_LABEL[mode]}
            align="left"
            onToggle={() => setOpen((current) => (current === "mode" ? null : "mode"))}
            onClose={() => setOpen(null)}
          >
            <ModeSwitch mode={mode} onChange={onMode} />
          </HeaderMenu>
          <HeaderMenu
            open={open === "log"}
            label="WebMCP log"
            badge={entries.length ? String(entries.length) : undefined}
            align="left"
            onToggle={() => setOpen((current) => (current === "log" ? null : "log"))}
            onClose={() => setOpen(null)}
          >
            <ActivityLog entries={entries} />
          </HeaderMenu>
        </div>
        <h1 className="text-base font-bold leading-tight tracking-tight">Guess the word</h1>
        <div className="flex flex-1 items-center justify-end gap-1.5">
          <HeaderMenu
            open={open === "rules"}
            label="Rules"
            onToggle={() => setOpen((current) => (current === "rules" ? null : "rules"))}
            onClose={() => setOpen(null)}
          >
            <Rules />
          </HeaderMenu>
          <button
            type="button"
            onClick={onNewGame}
            className="inline-flex min-w-[8rem] items-center justify-center border border-line bg-transparent px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]"
          >
            New game
          </button>
        </div>
      </div>
    </header>
  );
}
