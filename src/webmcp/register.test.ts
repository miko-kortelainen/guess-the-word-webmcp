import { afterEach, describe, expect, it, vi } from "vitest";
import { loadWordLists } from "../game/dictionary";
import { GameEngine } from "../game/engine";
import { MAX_TOOL_OUTPUT } from "../game/types";
import { answers } from "../data/answers";
import { activityLog } from "./activityLog";
import { registerAgentleTools } from "./register";
import { buildTools } from "./tools";

type StubTool = ReturnType<typeof buildTools>[number];

function installRegistry(impl?: (tool: StubTool, options?: { signal?: AbortSignal }) => Promise<void>) {
  const tools = new Map<string, StubTool>();
  const registerTool = vi.fn(async (tool: StubTool, options?: { signal?: AbortSignal }) => {
    if (impl) return impl(tool, options);
    if (options?.signal?.aborted) return;
    tools.set(tool.name, tool);
    options?.signal?.addEventListener("abort", () => {
      tools.delete(tool.name);
    });
  });
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: { registerTool },
  });
  return { tools, registerTool };
}

function clearRegistry() {
  Reflect.deleteProperty(document, "modelContext");
}

async function exec(tool: StubTool, input: unknown = {}) {
  return String(await tool.execute(input, { signal: new AbortController().signal }));
}

afterEach(() => {
  activityLog.reset();
  clearRegistry();
});

describe("WebMCP registration", () => {
  it("is a no-op when document.modelContext is absent", () => {
    clearRegistry();
    const engine = new GameEngine(loadWordLists());
    expect(() => registerAgentleTools(engine)()).not.toThrow();
  });

  it("registers all five tools when the API is present", async () => {
    const engine = new GameEngine(loadWordLists());
    const { tools } = installRegistry();
    registerAgentleTools(engine);
    await vi.waitFor(() => expect(tools.size).toBe(5));
    expect([...tools.keys()].sort()).toEqual(
      ["get_game_state", "new_game", "propose_guess", "submit_guess", "suggest_guesses"].sort(),
    );
  });

  it("catches registerTool rejection and does not propagate", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    installRegistry(async () => {
      throw new DOMException("denied", "NotAllowedError");
    });
    const engine = new GameEngine(loadWordLists());
    expect(() => registerAgentleTools(engine)).not.toThrow();
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
  });

  it("unregisters when the abort controller is aborted", async () => {
    const engine = new GameEngine(loadWordLists());
    const { tools } = installRegistry();
    const unregister = registerAgentleTools(engine);
    await vi.waitFor(() => expect(tools.size).toBe(5));
    unregister();
    expect(tools.size).toBe(0);
  });
});

describe("tools", () => {
  it("stays within character budgets", () => {
    const engine = new GameEngine(loadWordLists());
    for (const tool of buildTools(engine)) {
      expect(tool.name.length).toBeLessThanOrEqual(30);
      expect(tool.description.length).toBeLessThanOrEqual(500);
      const properties = tool.inputSchema.properties;
      for (const [param, schema] of Object.entries(properties)) {
        expect(param.length).toBeLessThanOrEqual(30);
        const description = (schema as { description?: string }).description;
        if (description) expect(description.length).toBeLessThanOrEqual(150);
      }
    }
  });

  it("reads live engine state rather than a stale closure", async () => {
    const engine = new GameEngine(loadWordLists());
    engine.newGame({ target: "crane" });
    const tools = Object.fromEntries(buildTools(engine).map((tool) => [tool.name, tool]));
    const before = JSON.parse(await exec(tools.get_game_state));
    expect(before.attemptsUsed).toBe(0);
    engine.submitGuess("slate", "human");
    const after = JSON.parse(await exec(tools.get_game_state));
    expect(after.attemptsUsed).toBe(1);
    expect(after.guesses[0].word).toBe("slate");
  });

  it("submit_guess mutates state that getSnapshot then reflects", async () => {
    const engine = new GameEngine(loadWordLists());
    engine.newGame({ target: "crane" });
    engine.setMode("autonomous");
    const tools = Object.fromEntries(buildTools(engine).map((tool) => [tool.name, tool]));
    const output = JSON.parse(await exec(tools.submit_guess, { word: "slate" }));
    expect(output.word).toBe("slate");
    expect(engine.getSnapshot().guesses[0].word).toBe("slate");
    expect(engine.getSnapshot().guesses[0].by).toBe("agent");
  });

  it("returns JSON under 1.5K characters, including a six-guess worst case", async () => {
    const engine = new GameEngine(loadWordLists());
    engine.newGame({ target: "crane" });
    engine.setMode("autonomous");
    const tools = Object.fromEntries(buildTools(engine).map((tool) => [tool.name, tool]));
    const fillers = answers.filter((word) => word !== "crane").slice(0, 6);
    for (const word of fillers.slice(0, 6)) {
      await exec(tools.submit_guess, { word });
    }
    const stateOut = await exec(tools.get_game_state);
    const suggestOut = await exec(tools.suggest_guesses, { count: 5 });
    expect(() => JSON.parse(stateOut)).not.toThrow();
    expect(() => JSON.parse(suggestOut)).not.toThrow();
    expect(stateOut.length).toBeLessThanOrEqual(MAX_TOOL_OUTPUT);
    expect(suggestOut.length).toBeLessThanOrEqual(MAX_TOOL_OUTPUT);
  });

  it("appends one activity-log entry per execute, and none for UI submitGuess", async () => {
    const engine = new GameEngine(loadWordLists());
    engine.newGame({ target: "crane" });
    const tools = Object.fromEntries(buildTools(engine).map((tool) => [tool.name, tool]));
    expect(activityLog.getSnapshot()).toHaveLength(0);
    engine.submitGuess("slate", "human");
    expect(activityLog.getSnapshot()).toHaveLength(0);
    await exec(tools.get_game_state);
    expect(activityLog.getSnapshot()).toHaveLength(1);
    await exec(tools.submit_guess, { word: "zzzzz" });
    const entries = activityLog.getSnapshot();
    expect(entries).toHaveLength(2);
    expect(entries[1].name).toBe("submit_guess");
    expect(entries[1].outcome).toMatchObject({ error: expect.any(String) });
  });

  it("returns structured errors for copilot submit and solo propose", async () => {
    const engine = new GameEngine(loadWordLists());
    engine.newGame({ target: "crane" });
    const tools = Object.fromEntries(buildTools(engine).map((tool) => [tool.name, tool]));
    const blocked = JSON.parse(await exec(tools.submit_guess, { word: "slate" }));
    expect(blocked.error).toBe("approval_required");
    engine.setMode("solo");
    const restricted = JSON.parse(await exec(tools.propose_guess, { word: "slate" }));
    expect(restricted.error).toBe("mode_restricted");
  });

  it("does not reveal the target while the puzzle is in play", async () => {
    const engine = new GameEngine(loadWordLists());
    engine.newGame({ target: "crane" });
    const tools = Object.fromEntries(buildTools(engine).map((tool) => [tool.name, tool]));
    const payload = JSON.parse(await exec(tools.get_game_state));
    expect(payload.revealedTarget).toBeUndefined();
    expect(JSON.stringify(payload)).not.toContain('"revealedTarget"');
  });

  it("survives execute(input) with no extras argument", async () => {
    const engine = new GameEngine(loadWordLists());
    engine.newGame({ target: "crane" });
    const tools = Object.fromEntries(buildTools(engine).map((tool) => [tool.name, tool]));
    await expect(tools.get_game_state.execute({})).resolves.toMatch(/"status"/);
    await expect(tools.new_game.execute(undefined)).resolves.toMatch(/New puzzle/);
  });
});
