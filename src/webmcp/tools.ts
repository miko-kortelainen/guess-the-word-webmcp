import type { GameEngine } from "../game/engine";
import { encodeFeedback } from "../game/feedback";
import { activityLog } from "./activityLog";
import { summarizeGuess } from "./payloads";

// Chrome 149's inspector sometimes calls execute(input) without the options argument.
type ToolExtras = Partial<WebMCP.ToolExecuteCallbackOptions>;

/*
 * untrustedContentHint is intentionally unset on every tool. Every string
 * these tools return originates in this application's own code and word lists:
 * no user-generated content, no external fetches, nothing an attacker could
 * inject into. Omitting the hint is a decision, not an oversight.
 */

const FEEDBACK_LEGEND =
  "Feedback is a five-character string: G = correct position, Y = present elsewhere, . = absent. Positions are 1-based.";

function logged(
  name: string,
  execute: (input: unknown, extras?: ToolExtras) => Promise<string>,
) {
  return async (input: unknown, extras?: ToolExtras): Promise<string> => {
    const output = await execute(input, extras);
    activityLog.append({
      name,
      arguments: (input ?? {}) as Record<string, unknown>,
      timestamp: Date.now(),
      outcome: JSON.parse(String(output)),
    });
    return output;
  };
}

function asRecord(input: unknown): Record<string, unknown> {
  return input !== null && typeof input === "object" ? (input as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function buildTools(engine: GameEngine) {
  const tools = [
    {
      name: "get_game_state",
      title: "Inspect the board",
      description:
        "Read the current puzzle: guesses played so far, per-letter feedback, " +
        "what has been ruled in or out, attempts left, and whose turn it is. " +
        FEEDBACK_LEGEND,
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: logged("get_game_state", async (_input, _extras) =>
        JSON.stringify(engine.getAgentState()),
      ),
    },
    {
      name: "suggest_guesses",
      title: "Rank candidate words",
      description:
        "Rank candidate guesses. Pool words still fit every clue and can win now; play one of those to solve. " +
        "A probe cannot win this turn — only use it to split the pool. why is at most 60 characters. " +
        FEEDBACK_LEGEND,
      inputSchema: {
        type: "object",
        properties: {
          count: {
            type: "integer",
            minimum: 1,
            maximum: 5,
            default: 3,
            description: "How many candidates to return (1-5).",
          },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: logged("suggest_guesses", async (input, _extras) => {
        const raw = asRecord(input).count;
        const count = Math.min(5, Math.max(1, typeof raw === "number" && Number.isFinite(raw) ? Math.floor(raw) : 3));
        const suggestions = engine.suggest(count);
        return JSON.stringify({
          candidatesRemaining: engine.getAgentState().candidatesRemaining,
          suggestions,
        });
      }),
    },
    {
      name: "propose_guess",
      title: "Stage a guess",
      description:
        "Stage a five-letter word for the player to accept or reject. Does not play the word. " +
        "Replaces any existing proposal. Blocked when the player has the agent on observe-only.",
      inputSchema: {
        type: "object",
        properties: {
          word: {
            type: "string",
            description: "A five-letter word to stage for the player's approval.",
          },
          reason: {
            type: "string",
            description: "One short sentence on why this word is a good move.",
          },
        },
        required: ["word"],
        additionalProperties: false,
      },
      execute: logged("propose_guess", async (input, _extras) => {
        const fields = asRecord(input);
        const word = asString(fields.word);
        const reason = asString(fields.reason);
        const result = engine.proposeGuess(word, reason);
        if (!result.ok) return JSON.stringify({ error: result.error, message: result.message });
        return JSON.stringify({
          staged: result.staged,
          awaitingApproval: true,
          message: `${result.staged.toUpperCase()} is on screen for the player to accept or reject. Wait for their decision, then call get_game_state.`,
        });
      }),
    },
    {
      name: "submit_guess",
      title: "Play a guess",
      description:
        "Play a five-letter word now. Blocked in co-pilot (use propose_guess) and observe-only. " +
        "Updates the board immediately. " +
        FEEDBACK_LEGEND,
      inputSchema: {
        type: "object",
        properties: {
          word: {
            type: "string",
            description: "The five-letter word to play.",
          },
        },
        required: ["word"],
        additionalProperties: false,
      },
      execute: logged("submit_guess", async (input, _extras) => {
        const word = asString(asRecord(input).word);
        const result = engine.submitGuess(word, "agent");
        if (!result.ok) return JSON.stringify({ error: result.error, message: result.message });
        const agent = engine.getAgentState();
        return JSON.stringify({
          word: result.word,
          feedback: encodeFeedback(result.feedback),
          status: result.status,
          attemptsRemaining: result.attemptsRemaining,
          summary: summarizeGuess(
            result.word,
            result.feedback,
            agent.candidatesRemaining,
            result.status,
            agent.revealedTarget,
          ),
        });
      }),
    },
    {
      name: "new_game",
      title: "Start a new puzzle",
      description:
        "Start a new random puzzle. Clears the board and any proposal. " +
        "Keeps the current collaboration mode. Six attempts.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      execute: logged("new_game", async (_input, _extras) => {
        engine.newGame();
        const agent = engine.getAgentState();
        return JSON.stringify({
          status: "playing",
          attemptsRemaining: 6,
          mode: agent.mode,
          message: "New puzzle. Six attempts.",
        });
      }),
    },
  ] satisfies WebMCP.ModelContextTool[];
  return tools;
}
