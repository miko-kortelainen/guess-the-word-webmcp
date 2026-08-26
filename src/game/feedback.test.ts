import { describe, expect, it } from "vitest";
import { scoreGuess } from "./feedback";

describe("scoreGuess", () => {
  it("returns five correct when guess equals target", () => {
    expect(scoreGuess("crane", "crane")).toEqual([
      "correct",
      "correct",
      "correct",
      "correct",
      "correct",
    ]);
  });

  it("scores ABBEY / BABES", () => {
    expect(scoreGuess("babes", "abbey")).toEqual([
      "present",
      "present",
      "correct",
      "correct",
      "absent",
    ]);
  });

  it("scores ALLOY / LLAMA", () => {
    expect(scoreGuess("llama", "alloy")).toEqual([
      "present",
      "correct",
      "present",
      "absent",
      "absent",
    ]);
  });

  it("scores SPEED / ERASE", () => {
    expect(scoreGuess("erase", "speed")).toEqual([
      "present",
      "absent",
      "absent",
      "present",
      "present",
    ]);
  });

  it("scores CRANE / EERIE", () => {
    expect(scoreGuess("eerie", "crane")).toEqual([
      "absent",
      "absent",
      "present",
      "absent",
      "correct",
    ]);
  });

  it("never marks more of a letter than the target contains", () => {
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    function randomWord(seed: number) {
      let x = seed;
      return Array.from({ length: 5 }, () => {
        x = (x * 1664525 + 1013904223) >>> 0;
        return alphabet[x % 26];
      }).join("");
    }

    for (let i = 0; i < 400; i++) {
      const target = randomWord(i * 2 + 1);
      const guess = randomWord(i * 2 + 2);
      const feedback = scoreGuess(guess, target);
      expect(feedback).toHaveLength(5);
      for (const letter of new Set(guess)) {
        const marked = feedback.filter((status, idx) => guess[idx] === letter && status !== "absent").length;
        const available = [...target].filter((ch) => ch === letter).length;
        expect(marked).toBeLessThanOrEqual(available);
      }
    }
  });

  it("is a pure function of its arguments", () => {
    const a = scoreGuess("slate", "crane");
    const b = scoreGuess("slate", "crane");
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
