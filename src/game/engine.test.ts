import { describe, expect, it } from "vitest";
import type { WordLists } from "./dictionary";
import { GameEngine } from "./engine";

function lists(): WordLists {
  const answers = [
    "crane",
    "abbey",
    "guard",
    "award",
    "dwarf",
    "solid",
    "speed",
    "alloy",
    "llama",
    "erase",
    "eerie",
    "babes",
  ];
  return { answers, allowed: new Set([...answers, "slate", "soare"]) };
}

function engine(target = "crane") {
  const game = new GameEngine(lists());
  game.newGame({ target });
  return game;
}

describe("GameEngine", () => {
  it("advances on a valid guess and does not consume an attempt on an invalid one", () => {
    const game = engine();
    expect(game.submitGuess("sharq", "human")).toMatchObject({ ok: false, error: "not_a_word" });
    expect(game.getSnapshot().guesses).toHaveLength(0);
    expect(game.submitGuess("gues", "human")).toMatchObject({ ok: false, error: "not_five_letters" });
    expect(game.getSnapshot().guesses).toHaveLength(0);
    expect(game.submitGuess("slate", "human")).toMatchObject({ ok: true, word: "slate" });
    expect(game.getSnapshot().guesses).toHaveLength(1);
    expect(game.getSnapshot().attemptsRemaining).toBe(5);
  });

  it("detects a win on any attempt", () => {
    const game = engine("crane");
    game.submitGuess("slate", "human");
    const win = game.submitGuess("crane", "human");
    expect(win).toMatchObject({ ok: true, status: "won" });
    expect(game.getSnapshot().status).toBe("won");
    expect(game.getSnapshot().revealedTarget).toBe("crane");
  });

  it("detects a loss on the sixth miss", () => {
    const game = engine("crane");
    for (const word of ["slate", "soare", "abbey", "solid", "speed", "alloy"]) {
      game.submitGuess(word, "human");
    }
    expect(game.getSnapshot().status).toBe("lost");
    expect(game.getSnapshot().revealedTarget).toBe("crane");
    expect(game.submitGuess("crane", "human")).toMatchObject({ ok: false, error: "game_over" });
  });

  it("newGame clears state and keeps mode", () => {
    const game = engine();
    game.setMode("autonomous");
    game.submitGuess("slate", "human");
    game.proposeGuess("guard", "test");
    game.newGame({ target: "abbey" });
    const state = game.getSnapshot();
    expect(state.mode).toBe("autonomous");
    expect(state.guesses).toEqual([]);
    expect(state.pendingProposal).toBeNull();
    expect(state.status).toBe("playing");
    expect(state.revealedTarget).toBeNull();
    expect(state.attemptsRemaining).toBe(6);
  });

  it("pins a known target and throws when it is not in the answer list", () => {
    const game = engine();
    game.newGame({ target: "abbey" });
    expect(game.submitGuess("abbey", "human")).toMatchObject({ ok: true, status: "won" });
    expect(() => game.newGame({ target: "zzzzz" })).toThrow(/not in the answer list/);
  });

  it("blocks agent submit in copilot and agent propose in solo", () => {
    const game = engine();
    expect(game.getSnapshot().mode).toBe("copilot");
    expect(game.submitGuess("slate", "agent")).toMatchObject({ ok: false, error: "approval_required" });
    expect(game.getSnapshot().guesses).toHaveLength(0);
    game.setMode("solo");
    expect(game.proposeGuess("slate", "hi")).toMatchObject({ ok: false, error: "mode_restricted" });
    expect(game.submitGuess("slate", "agent")).toMatchObject({ ok: false, error: "mode_restricted" });
    expect(game.submitGuess("slate", "human")).toMatchObject({ ok: true });
  });

  it("accepting a proposal plays exactly one agent guess", () => {
    const game = engine();
    game.proposeGuess("slate", "opens vowels");
    expect(game.getSnapshot().pendingProposal?.word).toBe("slate");
    const result = game.acceptProposal();
    expect(result).toMatchObject({ ok: true, word: "slate" });
    expect(game.getSnapshot().guesses).toEqual([
      expect.objectContaining({ word: "slate", by: "agent" }),
    ]);
    expect(game.getSnapshot().pendingProposal).toBeNull();
    expect(game.acceptProposal()).toMatchObject({ ok: false, error: "no_pending_proposal" });
  });

  it("omits the target from agent payloads while playing", () => {
    const game = engine("crane");
    game.submitGuess("slate", "human");
    const payload = JSON.stringify(game.getAgentState());
    expect(game.getAgentState().revealedTarget).toBeUndefined();
    expect(payload).not.toContain('"revealedTarget"');
    expect(game.getAgentState().status).toBe("playing");
  });

  it("getSnapshot returns a stable reference until state changes", () => {
    const game = engine();
    const a = game.getSnapshot();
    const b = game.getSnapshot();
    expect(a).toBe(b);
    game.submitGuess("slate", "human");
    expect(game.getSnapshot()).not.toBe(a);
  });
});
