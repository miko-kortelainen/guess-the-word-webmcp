import type {
  Clues,
  GameStatus,
  LetterStatus,
  Proposal,
} from "../game/types";
import { MAX_SUMMARY } from "../game/types";

const SMALL = ["zero", "one", "two", "three", "four", "five", "six"] as const;
const conjunction = new Intl.ListFormat("en-GB", { type: "conjunction" });

function smallNumber(n: number): string {
  return n >= 0 && n < SMALL.length ? SMALL[n] : String(n);
}

export function notFiveLettersMessage(raw: string): string {
  const display = raw.trim().toUpperCase() || "(empty)";
  const len = raw.trim().length;
  return `${display} is ${len} letter${len === 1 ? "" : "s"}. Play a five-letter word.`;
}

export function notAWordMessage(raw: string): string {
  return `${raw.trim().toUpperCase()} is not in the word list. Try another five-letter word.`;
}

export function gameOverMessage(status: GameStatus, attemptsUsed: number): string {
  const how = status === "won" ? `won in ${attemptsUsed}` : "lost";
  return `This puzzle is finished (${how}). Call new_game to start another.`;
}

export function approvalRequiredMessage(): string {
  return "Co-pilot mode is on, so the player approves each move. Call propose_guess with this word instead.";
}

export function modeRestrictedMessage(): string {
  return "The player has the agent set to observe only. They can change that on screen.";
}

export function noPendingProposalMessage(): string {
  return "There is no staged guess to approve. Call propose_guess first, or play a word yourself.";
}

export function buildSummary(args: {
  status: GameStatus;
  attemptsUsed: number;
  attemptsRemaining: number;
  clues: Clues;
  candidatesRemaining: number;
  pendingProposal: Proposal | null;
  revealedTarget?: string;
}): string {
  const parts: string[] = [];

  if (args.status === "won") {
    parts.push(`Won in ${args.attemptsUsed}.`);
  } else if (args.status === "lost") {
    parts.push(
      args.revealedTarget
        ? `Lost. The word was ${args.revealedTarget.toUpperCase()}.`
        : "Lost.",
    );
  } else if (args.attemptsUsed === 0) {
    parts.push("No guesses yet. Six attempts left.");
  } else {
    parts.push(
      `${capNum(args.attemptsUsed)} used, ${capNum(args.attemptsRemaining)} left.`,
    );
  }

  const confirmed = Object.entries(args.clues.confirmed).sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  );
  if (confirmed.length) {
    parts.push(
      confirmed
        .map(([pos, ch]) => `${ch.toUpperCase()} in position ${pos}`)
        .join("; ") + ".",
    );
  }

  const wrong = Object.entries(args.clues.inWordWrongSpot);
  if (wrong.length) {
    parts.push(
      wrong
        .map(
          ([ch, positions]) =>
            `${ch.toUpperCase()} is in the word but not position ${positions.join(" or ")}`,
        )
        .join(". ") + ".",
    );
  }

  if (args.clues.ruledOut.length) {
    const listed = args.clues.ruledOut.slice(0, 10).map((ch) => ch.toUpperCase());
    const extra = args.clues.ruledOut.length - listed.length;
    parts.push(
      extra > 0
        ? `${listed.join(", ")} and ${extra} more are ruled out.`
        : `${conjunction.format(listed)} ${listed.length === 1 ? "is" : "are"} ruled out.`,
    );
  }

  if (args.clues.minCount) {
    for (const [ch, n] of Object.entries(args.clues.minCount)) {
      parts.push(`The word has at least ${smallNumber(n)} ${ch.toUpperCase()}'s.`);
    }
  }
  if (args.clues.maxCount) {
    for (const [ch, n] of Object.entries(args.clues.maxCount)) {
      parts.push(
        n === 1
          ? `There is only one ${ch.toUpperCase()}.`
          : `${ch.toUpperCase()} appears at most ${smallNumber(n)} times.`,
      );
    }
  }

  if (args.status === "playing") {
    parts.push(
      args.candidatesRemaining === 1
        ? "1 word still fits."
        : `${args.candidatesRemaining} words still fit.`,
    );
  }

  if (args.pendingProposal) {
    parts.push(`Pending proposal: ${args.pendingProposal.word.toUpperCase()}.`);
  }

  return fit(capitalize(parts.join(" ")), MAX_SUMMARY);
}

export function summarizeGuess(
  word: string,
  feedback: LetterStatus[],
  candidatesRemaining: number,
  status: GameStatus,
  revealedTarget?: string,
): string {
  const correct: string[] = [];
  const present: string[] = [];
  const absent: string[] = [];
  feedback.forEach((statusAt, i) => {
    const ch = word[i].toUpperCase();
    const pos = i + 1;
    if (statusAt === "correct") correct.push(`${ch} in position ${pos}`);
    else if (statusAt === "present") present.push(`${ch} (not position ${pos})`);
    else absent.push(ch);
  });

  const parts = [`${word.toUpperCase()}:`];
  if (correct.length) parts.push(`${conjunction.format(correct)} ${correct.length === 1 ? "is" : "are"} in the right place.`);
  if (present.length) parts.push(`${conjunction.format(present)} ${present.length === 1 ? "is" : "are"} in the word.`);
  if (absent.length) {
    const unique = [...new Set(absent)];
    parts.push(`${conjunction.format(unique)} ${unique.length === 1 ? "is" : "are"} not in the word.`);
  }
  if (status === "won") parts.push("Puzzle solved.");
  else if (status === "lost") {
    parts.push(
      revealedTarget ? `No attempts left. The word was ${revealedTarget.toUpperCase()}.` : "No attempts left.",
    );
  } else {
    parts.push(
      candidatesRemaining === 1
        ? "1 word still fits."
        : `${candidatesRemaining} words still fit.`,
    );
  }
  return fit(parts.join(" "), MAX_SUMMARY);
}

function capNum(n: number): string {
  return n <= 6 ? smallNumber(n) : String(n);
}

function fit(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

function capitalize(text: string): string {
  return text.length ? text[0].toUpperCase() + text.slice(1) : text;
}
