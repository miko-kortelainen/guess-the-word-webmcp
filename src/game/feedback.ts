import type { LetterStatus } from "./types";
import { WORD_LENGTH } from "./types";

export function scoreGuess(guess: string, target: string): LetterStatus[] {
  const feedback: LetterStatus[] = Array(WORD_LENGTH).fill("absent");
  const remaining = new Map<string, number>();

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === target[i]) {
      feedback[i] = "correct";
    } else {
      remaining.set(target[i], (remaining.get(target[i]) ?? 0) + 1);
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (feedback[i] === "correct") continue;
    const left = remaining.get(guess[i]) ?? 0;
    if (left > 0) {
      feedback[i] = "present";
      remaining.set(guess[i], left - 1);
    }
  }

  return feedback;
}

export function sameFeedback(a: LetterStatus[], b: LetterStatus[]): boolean {
  return a.length === b.length && a.every((status, i) => status === b[i]);
}

export function encodeFeedback(feedback: LetterStatus[]): string {
  return feedback
    .map((status) => (status === "correct" ? "G" : status === "present" ? "Y" : "."))
    .join("");
}
