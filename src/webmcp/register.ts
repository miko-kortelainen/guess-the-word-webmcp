import type { GameEngine } from "../game/engine";
import { buildTools } from "./tools";

export function registerGuessTheWordTools(engine: GameEngine): () => void {
  if (typeof document === "undefined" || !document.modelContext) {
    return () => {};
  }

  const controller = new AbortController();

  void (async () => {
    for (const tool of buildTools(engine)) {
      try {
        await document.modelContext!.registerTool(tool, { signal: controller.signal });
      } catch (err) {
        console.warn(`[guess-the-word-webmcp] could not register ${tool.name}`, err);
      }
    }
  })();

  return () => controller.abort();
}
