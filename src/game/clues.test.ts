import { describe, expect, it } from "vitest";
import { scoreGuess } from "./feedback";
import { deriveClues } from "./solver";
import type { GuessResult } from "./types";

function guess(word: string, target: string, by: GuessResult["by"] = "human"): GuessResult {
  return { word, feedback: scoreGuess(word, target), by };
}

describe("deriveClues", () => {
  it("matches ABBEY / BABES", () => {
    expect(deriveClues([guess("babes", "abbey")])).toEqual({
      confirmed: { "3": "b", "4": "e" },
      inWordWrongSpot: { a: [2], b: [1] },
      ruledOut: ["s"],
      minCount: { b: 2 },
    });
  });

  it("matches SPEED / ERASE", () => {
    expect(deriveClues([guess("erase", "speed")])).toEqual({
      confirmed: {},
      inWordWrongSpot: { e: [1, 5], s: [4] },
      ruledOut: ["a", "r"],
      minCount: { e: 2 },
    });
  });

  it("matches CRANE / EERIE", () => {
    expect(deriveClues([guess("eerie", "crane")])).toEqual({
      confirmed: { "5": "e" },
      inWordWrongSpot: { r: [3] },
      ruledOut: ["i"],
      maxCount: { e: 1 },
    });
  });

  it("does not rule out a letter that is gray and green in the same guess", () => {
    const clues = deriveClues([guess("eerie", "crane")]);
    expect(clues.ruledOut).not.toContain("e");
  });

  it("omits minCount when every bound is 1", () => {
    const clues = deriveClues([guess("crane", "slate")]);
    expect(clues.minCount).toBeUndefined();
  });

  it("omits maxCount for ruled-out letters", () => {
    const clues = deriveClues([guess("babes", "abbey")]);
    expect(clues.ruledOut).toContain("s");
    expect(clues.maxCount?.s).toBeUndefined();
  });
});
