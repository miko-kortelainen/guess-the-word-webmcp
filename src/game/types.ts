export type LetterStatus = "correct" | "present" | "absent";
export type GameStatus = "playing" | "won" | "lost";
export type Mode = "solo" | "copilot" | "autonomous";
export type Player = "human" | "agent";

export type GuessResult = {
  word: string;
  feedback: LetterStatus[];
  by: Player;
};

export type Proposal = {
  word: string;
  reason: string;
  proposedAt: number;
};

export type GameState = {
  status: GameStatus;
  mode: Mode;
  attemptsRemaining: number;
  guesses: GuessResult[];
  pendingProposal: Proposal | null;
  revealedTarget: string | null;
};

export type Clues = {
  confirmed: Record<string, string>;
  inWordWrongSpot: Record<string, number[]>;
  ruledOut: string[];
  minCount?: Record<string, number>;
  maxCount?: Record<string, number>;
};

export type AgentState = {
  status: GameStatus;
  mode: Mode;
  attemptsUsed: number;
  attemptsRemaining: number;
  guesses: {
    word: string;
    feedback: string;
    by: Player;
  }[];
  clues: Clues;
  candidatesRemaining: number;
  pendingProposal: Proposal | null;
  summary: string;
  revealedTarget?: string;
};

export type Suggestion = {
  word: string;
  score: number;
  why: string;
};

export type ErrorCode =
  | "not_five_letters"
  | "not_a_word"
  | "game_over"
  | "approval_required"
  | "mode_restricted"
  | "no_pending_proposal";

export type ErrorOutcome = {
  ok: false;
  error: ErrorCode;
  message: string;
};

export type SubmitOutcome =
  | {
      ok: true;
      word: string;
      feedback: LetterStatus[];
      status: GameStatus;
      attemptsRemaining: number;
    }
  | ErrorOutcome;

export type ProposeOutcome = { ok: true; staged: string } | ErrorOutcome;

export const MAX_ATTEMPTS = 6;
export const WORD_LENGTH = 5;
export const MAX_TOOL_OUTPUT = 1500;
export const MAX_SUMMARY = 400;
export const MAX_WHY = 60;
