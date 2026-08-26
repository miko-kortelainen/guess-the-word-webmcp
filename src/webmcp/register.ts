import type { GameEngine } from "../game/engine";
import { buildTools } from "./tools";

export function registerGuessTheWordTools(engine: GameEngine): () => void {
  if (typeof document === "undefined" || !document.modelContext) {
    return () => {};
  }

  const controller = new AbortController();
  const [getGameState, suggestGuesses, proposeGuess, submitGuess, newGame] = buildTools(engine);
  const signal = controller.signal;

  void (async () => {
    if (!document.modelContext) return;

    try {
      await document.modelContext.registerTool({
        name: "get_game_state",
        title: getGameState.title,
        description: getGameState.description,
        inputSchema: getGameState.inputSchema,
        annotations: getGameState.annotations,
        execute: getGameState.execute,
      }, { signal });
    } catch (err) {
      console.warn("[guess-the-word-webmcp] could not register get_game_state", err);
    }

    try {
      await document.modelContext.registerTool({
        name: "suggest_guesses",
        title: suggestGuesses.title,
        description: suggestGuesses.description,
        inputSchema: suggestGuesses.inputSchema,
        annotations: suggestGuesses.annotations,
        execute: suggestGuesses.execute,
      }, { signal });
    } catch (err) {
      console.warn("[guess-the-word-webmcp] could not register suggest_guesses", err);
    }

    try {
      await document.modelContext.registerTool({
        name: "propose_guess",
        title: proposeGuess.title,
        description: proposeGuess.description,
        inputSchema: proposeGuess.inputSchema,
        annotations: proposeGuess.annotations,
        execute: proposeGuess.execute,
      }, { signal });
    } catch (err) {
      console.warn("[guess-the-word-webmcp] could not register propose_guess", err);
    }

    try {
      await document.modelContext.registerTool({
        name: "submit_guess",
        title: submitGuess.title,
        description: submitGuess.description,
        inputSchema: submitGuess.inputSchema,
        annotations: submitGuess.annotations,
        execute: submitGuess.execute,
      }, { signal });
    } catch (err) {
      console.warn("[guess-the-word-webmcp] could not register submit_guess", err);
    }

    try {
      await document.modelContext.registerTool({
        name: "new_game",
        title: newGame.title,
        description: newGame.description,
        inputSchema: newGame.inputSchema,
        annotations: newGame.annotations,
        execute: newGame.execute,
      }, { signal });
    } catch (err) {
      console.warn("[guess-the-word-webmcp] could not register new_game", err);
    }
  })();

  return () => controller.abort();
}
