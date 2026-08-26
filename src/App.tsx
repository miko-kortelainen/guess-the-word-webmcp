import { useFoley } from "@foleyjs/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Board } from "./components/Board";
import { GameStatus } from "./components/GameStatus";
import { Header } from "./components/Header";
import { Keyboard } from "./components/Keyboard";
import { cancelGameSounds, playGuessReveal } from "./foley/sounds";
import { engine } from "./game/engineInstance";
import { WORD_LENGTH } from "./game/types";
import { activityLog } from "./webmcp/activityLog";
import { registerGuessTheWordTools } from "./webmcp/register";

const MUTE_KEY = "guess-the-word-webmcp-muted";

export function App() {
  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
  const log = useSyncExternalStore(activityLog.subscribe, activityLog.getSnapshot, activityLog.getSnapshot);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("Type a five-letter word, or ask an agent for help.");
  const [announcement, setAnnouncement] = useState("");
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const { play, set } = useFoley({ volume: 0.7, muted, theme: "mechanical" });
  const revealedCount = useRef(0);
  const lastProposalAt = useRef<number | null | undefined>(undefined);

  useEffect(() => registerGuessTheWordTools(engine), []);

  useEffect(() => {
    setDraft("");
  }, [state.guesses.length, state.status]);

  useEffect(() => {
    if (state.guesses.length === 0 && state.status === "playing" && !state.pendingProposal) {
      return;
    }
    const summary = engine.getAgentState().summary;
    setAnnouncement(summary);
    if (state.status === "playing" && state.pendingProposal) setMessage(summary);
    if (state.status === "won" || state.status === "lost") setMessage("");
  }, [state.guesses, state.status, state.pendingProposal]);

  useEffect(() => {
    if (state.guesses.length === 0) {
      revealedCount.current = 0;
      return;
    }
    if (state.guesses.length <= revealedCount.current) return;
    const guess = state.guesses[state.guesses.length - 1];
    revealedCount.current = state.guesses.length;
    playGuessReveal(guess.feedback, state.status);
  }, [state.guesses, state.status]);

  useEffect(() => {
    const at = state.pendingProposal?.proposedAt ?? null;
    if (lastProposalAt.current !== undefined && at && at !== lastProposalAt.current) {
      play("ping");
    }
    lastProposalAt.current = at;
  }, [play, state.pendingProposal]);

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
      play(result.error === "not_a_word" || result.error === "not_five_letters" ? "denied" : "error");
      setMessage(result.message);
      setAnnouncement(result.message);
      return;
    }
    setDraft("");
    setMessage(state.status === "playing" ? engine.getAgentState().summary : "");
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    try {
      localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    } catch {
      /* ignore quota / private-mode failures */
    }
    if (next) {
      queueMicrotask(() => set({ muted: true }));
    } else {
      set({ muted: false });
      play("on");
    }
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
      if (draft.length > 0) play("thock", { pitch: -1 });
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
      if (state.status === "playing" && draft.length < WORD_LENGTH) play("thock");
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
        muted={muted}
        onMode={(mode) => engine.setMode(mode)}
        onToggleMute={toggleMute}
        onNewGame={() => {
          cancelGameSounds();
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
