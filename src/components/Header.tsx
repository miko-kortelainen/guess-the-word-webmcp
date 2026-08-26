import { useState } from "react";
import { HiOutlineSpeakerWave, HiSpeakerXMark } from "react-icons/hi2";
import type { Mode } from "../game/types";
import type { ActivityEntry } from "../webmcp/activityLog";
import { ActivityLog } from "./ActivityLog";
import { HeaderMenu } from "./HeaderMenu";
import { ModeSwitch } from "./ModeSwitch";
import { Rules } from "./Rules";

const MUTE_ICON_TRANSITION =
  "transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none motion-reduce:scale-100 motion-reduce:blur-0";

const MODE_LABEL: Record<Mode, string> = {
  solo: "Observe",
  copilot: "Co-pilot",
  autonomous: "Auto",
};

type Props = {
  mode: Mode;
  entries: ActivityEntry[];
  muted: boolean;
  onMode: (mode: Mode) => void;
  onToggleMute: () => void;
  onNewGame: () => void;
};

export function Header({ mode, entries, muted, onMode, onToggleMute, onNewGame }: Props) {
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
            data-foley-click="swoosh"
            className="inline-flex min-w-[8rem] items-center justify-center border border-line bg-transparent px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]"
          >
            New game
          </button>
          <button
            type="button"
            aria-pressed={muted}
            aria-label={muted ? "Unmute sounds" : "Mute sounds"}
            onClick={onToggleMute}
            data-foley-press="press"
            data-foley-release="release"
            className="inline-flex items-center justify-center self-stretch border border-line bg-transparent px-2.5"
          >
            <span className="relative inline-flex rtl:-scale-x-100">
              <span
                className={`absolute inset-0 flex items-center justify-center ${MUTE_ICON_TRANSITION} ${
                  muted ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]"
                }`}
                aria-hidden="true"
              >
                <HiSpeakerXMark size={18} />
              </span>
              <span
                className={`flex items-center justify-center ${MUTE_ICON_TRANSITION} ${
                  muted ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-0"
                }`}
                aria-hidden="true"
              >
                <HiOutlineSpeakerWave size={18} />
              </span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
