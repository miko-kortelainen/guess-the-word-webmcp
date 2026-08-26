import { play } from "@foleyjs/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelGameSounds, playGuessReveal, TILE_REVEAL_STAGGER_MS } from "./sounds";

vi.mock("@foleyjs/core", () => ({
  play: vi.fn(),
}));

describe("playGuessReveal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(play).mockReset();
  });

  afterEach(() => {
    cancelGameSounds();
    vi.useRealTimers();
  });

  it("plays a staggered cue for each tile, then sparkle on a win", () => {
    playGuessReveal(["correct", "present", "absent", "correct", "correct"], "won");

    vi.advanceTimersByTime(0);
    expect(play).toHaveBeenNthCalledWith(1, "pop", expect.objectContaining({ pitch: 0, pan: -0.7 }));

    vi.advanceTimersByTime(TILE_REVEAL_STAGGER_MS);
    expect(play).toHaveBeenNthCalledWith(2, "ping", expect.objectContaining({ pitch: 0 }));

    vi.advanceTimersByTime(TILE_REVEAL_STAGGER_MS);
    expect(play).toHaveBeenNthCalledWith(3, "tap", expect.objectContaining({ pitch: -2 }));

    vi.advanceTimersByTime(TILE_REVEAL_STAGGER_MS * 2 + 420);
    expect(play).toHaveBeenCalledWith("sparkle");
  });

  it("does not play cues after cancelGameSounds", () => {
    playGuessReveal(["correct", "correct", "correct", "correct", "correct"], "won");
    cancelGameSounds();
    vi.advanceTimersByTime(2000);
    expect(play).not.toHaveBeenCalled();
  });
});
