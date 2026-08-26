import type { WordLists } from "./dictionary";
import { encodeFeedback, scoreGuess } from "./feedback";
import {
  approvalRequiredMessage,
  buildSummary,
  gameOverMessage,
  modeRestrictedMessage,
  noPendingProposalMessage,
  notAWordMessage,
  notFiveLettersMessage,
} from "../webmcp/payloads";
import { candidatesFor, deriveClues, rankSuggestions } from "./solver";
import type {
  AgentState,
  ErrorCode,
  ErrorOutcome,
  GameState,
  GameStatus,
  GuessResult,
  Mode,
  Player,
  Proposal,
  ProposeOutcome,
  SubmitOutcome,
  Suggestion,
} from "./types";
import { MAX_ATTEMPTS, WORD_LENGTH } from "./types";

export type NewGameOpts = { target?: string };

export class GameEngine {
  private readonly wordLists: WordLists;
  private readonly listeners = new Set<() => void>();
  private target = "";
  private status: GameStatus = "playing";
  private mode: Mode = "copilot";
  private guesses: GuessResult[] = [];
  private pendingProposal: Proposal | null = null;
  private snapshot: GameState;

  constructor(wordLists: WordLists) {
    this.wordLists = wordLists;
    this.snapshot = this.buildSnapshot();
    this.newGame();
  }

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  getSnapshot = (): GameState => this.snapshot;

  getAgentState(): AgentState {
    const clues = deriveClues(this.guesses);
    const candidatesRemaining = candidatesFor(this.guesses, this.wordLists.answers).length;
    const revealedTarget = this.status === "playing" ? undefined : this.target;
    const summary = buildSummary({
      status: this.status,
      attemptsUsed: this.guesses.length,
      attemptsRemaining: this.attemptsRemaining(),
      clues,
      candidatesRemaining,
      pendingProposal: this.pendingProposal,
      revealedTarget,
    });
    return {
      status: this.status,
      mode: this.mode,
      attemptsUsed: this.guesses.length,
      attemptsRemaining: this.attemptsRemaining(),
      guesses: this.guesses.map((guess) => ({
        word: guess.word,
        feedback: encodeFeedback(guess.feedback),
        by: guess.by,
      })),
      clues,
      candidatesRemaining,
      pendingProposal: this.pendingProposal,
      summary,
      ...(revealedTarget ? { revealedTarget } : {}),
    };
  }

  submitGuess(word: string, by: Player): SubmitOutcome {
    if (this.status !== "playing") {
      return fail("game_over", gameOverMessage(this.status, this.guesses.length));
    }
    if (by === "agent" && this.mode === "solo") {
      return fail("mode_restricted", modeRestrictedMessage());
    }
    if (by === "agent" && this.mode === "copilot") {
      return fail("approval_required", approvalRequiredMessage());
    }
    return this.playGuess(word, by);
  }

  proposeGuess(word: string, reason: string): ProposeOutcome {
    if (this.status !== "playing") {
      return fail("game_over", gameOverMessage(this.status, this.guesses.length));
    }
    if (this.mode === "solo") {
      return fail("mode_restricted", modeRestrictedMessage());
    }
    const parsed = this.parseWord(word);
    if (!parsed.ok) return parsed;
    this.pendingProposal = {
      word: parsed.word,
      reason: reason.trim(),
      proposedAt: Date.now(),
    };
    this.emit();
    return { ok: true, staged: parsed.word };
  }

  acceptProposal(): SubmitOutcome {
    if (!this.pendingProposal) {
      return fail("no_pending_proposal", noPendingProposalMessage());
    }
    const word = this.pendingProposal.word;
    this.pendingProposal = null;
    if (this.status !== "playing") {
      this.emit();
      return fail("game_over", gameOverMessage(this.status, this.guesses.length));
    }
    return this.playGuess(word, "agent");
  }

  rejectProposal(): void {
    if (!this.pendingProposal) return;
    this.pendingProposal = null;
    this.emit();
  }

  setMode(mode: Mode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.emit();
  }

  newGame(opts?: NewGameOpts): void {
    if (opts?.target !== undefined) {
      const pinned = opts.target.trim().toLowerCase();
      if (!this.wordLists.answers.includes(pinned)) {
        throw new Error(`newGame target "${opts.target}" is not in the answer list`);
      }
      this.target = pinned;
    } else {
      const list = this.wordLists.answers;
      this.target = list[Math.floor(Math.random() * list.length)];
    }
    this.status = "playing";
    this.guesses = [];
    this.pendingProposal = null;
    this.emit();
  }

  suggest(count: number): Suggestion[] {
    return rankSuggestions({
      guesses: this.guesses,
      answers: this.wordLists.answers,
      allowed: this.wordLists.allowed,
      attemptsLeft: this.attemptsRemaining(),
      count,
    });
  }

  private playGuess(word: string, by: Player): SubmitOutcome {
    const parsed = this.parseWord(word);
    if (!parsed.ok) return parsed;
    const feedback = scoreGuess(parsed.word, this.target);
    this.guesses = [...this.guesses, { word: parsed.word, feedback, by }];
    this.pendingProposal = null;
    if (feedback.every((status) => status === "correct")) {
      this.status = "won";
    } else if (this.guesses.length >= MAX_ATTEMPTS) {
      this.status = "lost";
    }
    this.emit();
    return {
      ok: true,
      word: parsed.word,
      feedback,
      status: this.status,
      attemptsRemaining: this.attemptsRemaining(),
    };
  }

  private parseWord(
    raw: string,
  ): { ok: true; word: string } | SubmitOutcome & { ok: false } {
    const trimmed = raw.trim();
    const word = trimmed.toLowerCase();
    if (!/^[a-z]{5}$/.test(word) || word.length !== WORD_LENGTH) {
      return fail("not_five_letters", notFiveLettersMessage(trimmed));
    }
    if (!this.wordLists.allowed.has(word)) {
      return fail("not_a_word", notAWordMessage(trimmed));
    }
    return { ok: true, word };
  }

  private attemptsRemaining(): number {
    return Math.max(0, MAX_ATTEMPTS - this.guesses.length);
  }

  private buildSnapshot(): GameState {
    return {
      status: this.status,
      mode: this.mode,
      attemptsRemaining: this.attemptsRemaining(),
      guesses: this.guesses,
      pendingProposal: this.pendingProposal,
      revealedTarget: this.status === "playing" ? null : this.target,
    };
  }

  private emit(): void {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }
}

function fail(error: ErrorCode, message: string): ErrorOutcome {
  return { ok: false, error, message };
}
