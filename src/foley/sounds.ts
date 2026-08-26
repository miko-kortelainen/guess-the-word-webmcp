import { play, type CueName } from "@foleyjs/core";
import type { GameStatus, LetterStatus } from "../game/types";

export const TILE_REVEAL_STAGGER_MS = 80;
const WIN_CUE_AFTER_MS = 420;

const TILE_CUE: Record<LetterStatus, CueName> = {
  correct: "pop",
  present: "ping",
  absent: "tap",
};

let generation = 0;

export function cancelGameSounds() {
  generation += 1;
}

function later(ms: number, fn: () => void) {
  const gen = generation;
  window.setTimeout(() => {
    if (gen !== generation) return;
    fn();
  }, ms);
}

export function playGuessReveal(feedback: LetterStatus[], status: GameStatus) {
  feedback.forEach((letterStatus, col) => {
    later(col * TILE_REVEAL_STAGGER_MS, () => {
      play(TILE_CUE[letterStatus], {
        pitch: letterStatus === "correct" ? col * 2 : letterStatus === "absent" ? -2 : 0,
        pan: (col - 2) * 0.35,
      });
    });
  });

  const afterRow = (feedback.length - 1) * TILE_REVEAL_STAGGER_MS + WIN_CUE_AFTER_MS;
  if (status === "won") later(afterRow, () => play("sparkle"));
  if (status === "lost") later(afterRow, () => play("warning"));
}
