# guess-the-word-webmcp

A five-letter word guessing game with two interfaces to **one** game state: a visual board for humans, and [WebMCP](https://github.com/webmachinelearning/webmcp) tools for an agent in the browser.

The agent can inspect the board, rank candidates, propose a guess for you to approve, submit a guess when you have granted that permission, and start a new puzzle. It is not clicking the page. It calls the same engine the board does.

## Live demo

Deploy with Vercel (GitHub integration or `npx vercel`). `vercel.json` already sends `Origin-Agent-Cluster: ?1`, which WebMCP needs. Confirm after deploy:

```bash
curl -sI https://YOUR-DOMAIN | grep -i origin-agent-cluster
```

The response must include `Origin-Agent-Cluster: ?1`. WebMCP is silent without it.

A public URL for the current build will live here once the project is deployed.

## Screenshots

Run `npm run dev` and open the printed localhost URL. The board is centered. **Authority** and **Log** in the header open the collaboration mode switch and the live activity log. A staged proposal still appears on the board.

## The accessibility argument

The usual interface for this genre is a colour-coded grid. That is a poor fit for screen reader users, people with colour vision deficiency, people with motor impairments, and anyone using magnification.

With tools registered, the same game is playable through conversation. The agent can read the board in words, explain what each clue eliminated, offer candidates, and play on instruction. No grid navigation, no colour perception, no pointer precision.

That is an **alternative modality**, not a substitute for accessible markup. The board has grid semantics, per-tile labels in words, a live region, a second channel besides colour (bar, inner ring, strikethrough), keyboard-operable controls, and `prefers-reduced-motion` support.

WebMCP itself is not an accessibility API and is not designed to interact with a page's accessibility tree. The agent is an intermediary. This project does not claim WCAG conformance.

## Architecture

```text
Human  →  React UI  ─┐
                     ├→  Game engine (plain TypeScript)  →  Solver
Agent  →  WebMCP tools ─┘         │
                                  └── change events → UI
                      tool-call records → activity log
```

Rules:

1. The UI and the tool layer never implement game rules. Both call the engine.
2. There is one engine instance, created at module scope. React subscribes with `useSyncExternalStore`. Engine state is not mirrored into `useState`.

## The five tools

Feedback in tool output is a five-character string: `G` correct position, `Y` present elsewhere, `.` absent. Positions are **1-based**.

### `get_game_state`

Read-only. Empty input.

```json
{
  "status": "playing",
  "mode": "copilot",
  "attemptsUsed": 2,
  "attemptsRemaining": 4,
  "guesses": [
    { "word": "crane", "feedback": ".YG..", "by": "human" },
    { "word": "solid", "feedback": "....G", "by": "agent" }
  ],
  "clues": {
    "confirmed": { "3": "a", "5": "d" },
    "inWordWrongSpot": { "r": [2] },
    "ruledOut": ["c", "e", "i", "l", "n", "o", "s"]
  },
  "candidatesRemaining": 4,
  "pendingProposal": null,
  "summary": "Two used, four left. A in position 3; D in position 5. R is in the word but not position 2. C, E, I, L, N, O and S are ruled out. 4 words still fit."
}
```

### `suggest_guesses`

Read-only. Optional `count` (1–5, default 3).

```json
{
  "candidatesRemaining": 4,
  "suggestions": [
    { "word": "guard", "score": 0.94, "why": "fits every clue; tests G, U" },
    { "word": "award", "score": 0.88, "why": "fits every clue; tests W" },
    { "word": "dwarf", "score": 0.61, "why": "cannot win, but tests D, W, F" }
  ]
}
```

Pool words still fit every clue. A probe cannot win this turn.

### `propose_guess`

Stages a word. Does not play it. Blocked in observe-only mode.

```json
{ "staged": "guard", "awaitingApproval": true, "message": "GUARD is on screen for the player to accept or reject. Wait for their decision, then call get_game_state." }
```

### `submit_guess`

Plays a word. Blocked in co-pilot (`approval_required`) and observe-only (`mode_restricted`).

### `new_game`

Starts a random puzzle. Keeps the current mode. The tool does not choose a target.

## Registration (verbatim)

The repository contains this call, as required:

```js
await document.modelContext.registerTool({
  name: "get_game_state",
  title: "Inspect the board",
  description:
    "Read the current puzzle: guesses played so far, per-letter feedback, " +
    "what has been ruled in or out, attempts left, and whose turn it is.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { readOnlyHint: true },
  execute: async (_input, { signal }) => JSON.stringify(engine.getAgentState()),
});
```

See `src/webmcp/register.ts` for the production loop: every `registerTool` is awaited, rejections are caught, and an `AbortController` unregisters on React StrictMode cleanup.

## Local setup

```bash
npm install
npm run dev
npm run build
npm run preview
npm run test
```

Requires Node 20+. After first paint the game makes no network calls. There is no account and no backend.

## WebMCP testing

Test in this order. The first environment is the one that decides a hackathon submission.

1. **ChatGPT desktop app, in-app browser.** WebMCP is enabled by default here. Open the deployed HTTPS URL and ask the agent to inspect the puzzle, suggest a word, and propose it.
2. **Chrome 149 or later** with `chrome://flags/#enable-webmcp-testing` set to Enabled, then relaunch. Open the same URL.
3. **Development only:** the Model Context Tool Inspector extension, which lists registered tools and lets you call them with JSON. It requires the Chrome flag even on Chrome 150+. Chrome DevTools also lists registered tools.

An origin trial token is optional insurance so the deployed origin can work without the flag. Both judging paths above already work without a token. This build ships without a token.

Record the Chrome version you used when filing a write-up. This README was written against the WebMCP sources listed below, verified 2026-08-25 in the product spec.

## Mode and authority

Default mode is **co-pilot**. Only the human can change mode. There is **no tool to change mode**. An agent that can grant itself submit authority does not have an authority model.

| Mode | `get_game_state` / `suggest_guesses` | `propose_guess` | `submit_guess` |
| --- | --- | --- | --- |
| Observe (`solo`) | yes | `mode_restricted` | `mode_restricted` |
| Co-pilot | yes | stages a card | `approval_required` |
| Autonomous | yes | stages a card | plays the word |

Mode is enforced in the engine, not only in the tool layer.

## Word lists

See [`src/data/WORDLIST_LICENSE.md`](src/data/WORDLIST_LICENSE.md). Word strings come from [dwyl/english-words](https://github.com/dwyl/english-words) (Unlicense). Frequency ranking for the answer subset uses Peter Norvig's publicly posted `count_1w.txt`. No proprietary answer list is used.

## Known limitations

- WebMCP is an experimental, Chrome-oriented, origin-trial API. The entry point has already moved once (`navigator.modelContext` was removed; this app uses `document.modelContext`).
- The target word exists in the client bundle. Tool output hides it while the puzzle is in play. That is leak-prevention through the agent interface, not a cheat-proof architecture.
- The suggestion engine is deterministic local code. It is not a language model. This application makes **no LLM API calls**.
- Tile contrast and keyboard access were designed in, but this project does not claim a WCAG audit.

## References

- [WebMCP explainer](https://github.com/webmachinelearning/webmcp)
- [webmcp-types](https://www.npmjs.com/package/webmcp-types)
- [Chrome Imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [Chrome WebMCP overview](https://developer.chrome.com/docs/ai/webmcp)
- [Tool security guidance](https://developer.chrome.com/docs/ai/webmcp/secure-tools)
- [Best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices)
- [Origin trial announcement](https://developer.chrome.com/blog/ai-webmcp-origin-trial)

## Licence

MIT. See `LICENSE`.
