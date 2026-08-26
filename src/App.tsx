import { useEffect, useState, useSyncExternalStore } from "react";
import { Board } from "./components/Board";
import { GameStatus } from "./components/GameStatus";
import { Header } from "./components/Header";
import { Keyboard } from "./components/Keyboard";
import { engine } from "./game/engineInstance";
import { WORD_LENGTH } from "./game/types";
import { activityLog } from "./webmcp/activityLog";
import { registerAgentleTools } from "./webmcp/register";

export function App() {
  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
  const log = useSyncExternalStore(activityLog.subscribe, activityLog.getSnapshot, activityLog.getSnapshot);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("Type a five-letter word, or ask an agent for help.");
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => registerAgentleTools(engine), []);

  useEffect(() => {
    setDraft("");
  }, [state.guesses.length, state.status]);

  useEffect(() => {
    if (state.guesses.length === 0 && state.status === "playing" && !state.pendingProposal) {
      return;
    }
    const summary = engine.getAgentState().summary;
    setAnnouncement(summary);
    if (state.status !== "playing" || state.pendingProposal) setMessage(summary);
  }, [state.guesses, state.status, state.pendingProposal]);

  function typeLetter(letter: string) {
    if (state.status !== "playing") return;
    const ch = letter.toLowerCase();
    if (!/^[a-z]$/.test(ch)) return;
    setDraft((current) => (current.length < WORD_LENGTH ? current + ch : current));
  }

  function backspace() {
    setDraft((current) => current.slice(0, -1));
  }

  function submitDraft() {
    if (state.status !== "playing") return;
    const result = engine.submitGuess(draft, "human");
    if (!result.ok) {
      setMessage(result.message);
      setAnnouncement(result.message);
      return;
    }
    setDraft("");
    setMessage(engine.getAgentState().summary);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (tag === "BUTTON" && (event.key === "Enter" || event.key === " ")) return;
    if (target?.closest("[role='dialog']")) return;

    if (event.key === "Backspace") {
      event.preventDefault();
      backspace();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      submitDraft();
      return;
    }
    if (/^[a-zA-Z]$/.test(event.key)) {
      event.preventDefault();
      typeLetter(event.key);
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <a
        href="#board"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:border focus:border-brand focus:bg-paper focus:px-3 focus:py-2"
      >
        Skip to board
      </a>
      <Header
        mode={state.mode}
        entries={log}
        onMode={(mode) => engine.setMode(mode)}
        onNewGame={() => {
          engine.newGame();
          setMessage("");
          setAnnouncement("");
        }}
      />
      <main className="mx-auto max-w-xl px-4 py-6">
        <section aria-label="Game" className="grid gap-4">
          <GameStatus state={state} message={message} />
          <Board
            state={state}
            draft={draft}
            onAccept={() => {
              const result = engine.acceptProposal();
              setMessage(result.ok ? engine.getAgentState().summary : result.message);
              setAnnouncement(result.ok ? engine.getAgentState().summary : result.message);
            }}
            onReject={() => {
              engine.rejectProposal();
              setMessage("Proposal rejected.");
              setAnnouncement("Proposal rejected.");
            }}
          />
          <Keyboard
            guesses={state.guesses}
            onLetter={typeLetter}
            onEnter={submitDraft}
            onBackspace={backspace}
            disabled={state.status !== "playing"}
          />
        </section>
      </main>
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}
