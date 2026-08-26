import { describe, expect, it } from "vitest";
import { answers } from "../data/answers";
import { allowed } from "../data/allowed";
import { loadWordLists } from "./dictionary";
import { GameEngine } from "./engine";
import { OPENERS } from "./openers";
import { candidatesFor, rankSuggestions } from "./solver";
import type { GuessResult } from "./types";

describe("word lists", () => {
  it("includes every answer in allowed", () => {
    const allow = new Set(allowed);
    for (const word of answers) {
      expect(allow.has(word)).toBe(true);
    }
  });

  it("stores lowercase five-letter alphabetic words", () => {
    for (const word of [...answers, ...allowed.slice(0, 50)]) {
      expect(word).toMatch(/^[a-z]{5}$/);
    }
  });
});

describe("solver", () => {
  it("keeps the target in the candidate pool across randomised play", () => {
    const lists = loadWordLists();
    const game = new GameEngine(lists);
    for (let seed = 0; seed < 40; seed++) {
      const target = lists.answers[(seed * 97) % lists.answers.length];
      game.newGame({ target });
      let pool = candidatesFor(game.getSnapshot().guesses, lists.answers);
      expect(pool).toContain(target);
      for (let turn = 0; turn < 6; turn++) {
        const guess = lists.answers[(seed * 13 + turn * 31) % lists.answers.length];
        const before = pool.length;
        game.submitGuess(guess, "human");
        if (game.getSnapshot().status !== "playing") break;
        pool = candidatesFor(game.getSnapshot().guesses, lists.answers);
        expect(pool).toContain(target);
        expect(pool.length).toBeLessThanOrEqual(before);
      }
    }
  });

  it("returns only pool words when one attempt remains or the pool is tiny", () => {
    const lists = loadWordLists();
    const game = new GameEngine(lists);
    game.newGame({ target: "crane" });
    for (let i = 0; i < 5; i++) {
      game.submitGuess(lists.answers[i] === "crane" ? lists.answers[i + 10] : lists.answers[i], "human");
    }
    expect(game.getSnapshot().attemptsRemaining).toBe(1);
    const pool = new Set(candidatesFor(game.getSnapshot().guesses, lists.answers));
    const suggestions = game.suggest(5);
    expect(suggestions.length).toBeGreaterThan(0);
    for (const row of suggestions) {
      expect(pool.has(row.word)).toBe(true);
    }
  });

  it("may return a probe from allowed whose why says it cannot win", () => {
    const answersTiny = answers.slice(0, 40);
    const allow = new Set([...answersTiny, ...allowed.slice(0, 400)]);
    const guesses: GuessResult[] = [
      {
        word: answersTiny[0],
        feedback: ["absent", "absent", "absent", "absent", "absent"],
        by: "human",
      },
    ];
    const suggestions = rankSuggestions({
      guesses,
      answers: answersTiny,
      allowed: allow,
      attemptsLeft: 5,
      count: 5,
    });
    const pool = new Set(candidatesFor(guesses, answersTiny));
    expect(pool.size).toBeGreaterThan(2);
    const probe = suggestions.find((row) => !pool.has(row.word));
    if (probe) {
      expect(allow.has(probe.word)).toBe(true);
      expect(probe.why.toLowerCase()).toContain("cannot win");
    }
  });

  it("uses hardcoded openers on the first move", () => {
    for (const word of OPENERS) {
      expect(answers).toContain(word);
    }
    const suggestions = rankSuggestions({
      guesses: [],
      answers,
      allowed: new Set(allowed),
      attemptsLeft: 6,
      count: 5,
    });
    expect(suggestions.map((row) => row.word)).toEqual(OPENERS.slice(0, 5));
  });

  it("ranks a pool word first after TESTS toward SAVES", () => {
    const lists = loadWordLists();
    const game = new GameEngine(lists);
    game.newGame({ target: "saves" });
    game.submitGuess("tests", "human");
    const pool = new Set(candidatesFor(game.getSnapshot().guesses, lists.answers));
    expect(pool.size).toBeGreaterThan(2);
    const suggestions = game.suggest(5);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(pool.has(suggestions[0].word)).toBe(true);
    expect(suggestions[0].why.toLowerCase()).not.toContain("cannot win");
    expect(suggestions[0].score).toBe(1);
  });
});
