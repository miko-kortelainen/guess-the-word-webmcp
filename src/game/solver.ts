import { OPENERS } from "./openers";
import { encodeFeedback, sameFeedback, scoreGuess } from "./feedback";
import type { Clues, GuessResult, Suggestion } from "./types";
import { MAX_WHY, WORD_LENGTH } from "./types";

export function candidatesFor(guesses: GuessResult[], answers: readonly string[]): string[] {
  return answers.filter((candidate) =>
    guesses.every((guess) => sameFeedback(scoreGuess(guess.word, candidate), guess.feedback)),
  );
}

export function deriveClues(guesses: GuessResult[]): Clues {
  const confirmed: Record<string, string> = {};
  const wrongSpot = new Map<string, Set<number>>();
  const minCount = new Map<string, number>();
  const maxCount = new Map<string, number>();
  const ruledOut = new Set<string>();

  for (const { word, feedback } of guesses) {
    const accounted = new Map<string, number>();

    for (let i = 0; i < WORD_LENGTH; i++) {
      const ch = word[i];
      const pos = i + 1;
      if (feedback[i] === "correct") {
        confirmed[String(pos)] = ch;
        accounted.set(ch, (accounted.get(ch) ?? 0) + 1);
      } else if (feedback[i] === "present") {
        if (!wrongSpot.has(ch)) wrongSpot.set(ch, new Set());
        wrongSpot.get(ch)!.add(pos);
        accounted.set(ch, (accounted.get(ch) ?? 0) + 1);
      }
    }

    for (const ch of new Set(word)) {
      const acc = accounted.get(ch) ?? 0;
      const hadAbsent = [...word].some((c, i) => c === ch && feedback[i] === "absent");
      minCount.set(ch, Math.max(minCount.get(ch) ?? 0, acc));
      if (hadAbsent) {
        maxCount.set(ch, Math.min(maxCount.get(ch) ?? Infinity, acc));
        if (acc === 0) ruledOut.add(ch);
      }
    }
  }

  const minCountOut = Object.fromEntries([...minCount].filter(([, n]) => n > 1));
  const maxCountOut = Object.fromEntries(
    [...maxCount].filter(([ch, n]) => n > 0 && !ruledOut.has(ch)),
  );

  return {
    confirmed,
    inWordWrongSpot: Object.fromEntries(
      [...wrongSpot].map(([ch, set]) => [ch, [...set].sort((a, b) => a - b)]),
    ),
    ruledOut: [...ruledOut].sort(),
    ...(Object.keys(minCountOut).length ? { minCount: minCountOut } : {}),
    ...(Object.keys(maxCountOut).length ? { maxCount: maxCountOut } : {}),
  };
}

export type RankArgs = {
  guesses: GuessResult[];
  answers: readonly string[];
  allowed: ReadonlySet<string>;
  attemptsLeft: number;
  count: number;
};

export function rankSuggestions(args: RankArgs): Suggestion[] {
  const count = Math.min(5, Math.max(1, Math.floor(args.count) || 3));
  const pool = candidatesFor(args.guesses, args.answers);
  const n = pool.length;
  if (n === 0) return [];

  if (args.guesses.length === 0) {
    const openers = OPENERS.filter((word) => args.answers.includes(word)).slice(0, count);
    if (openers.length > 0) {
      return scaleBatch(
        openers.map((word, i) => ({
          word,
          raw: OPENERS.length - i,
          why: whyOpener(word),
        })),
      );
    }
  }

  const clues = deriveClues(args.guesses);
  const allowProbes = n > 2 && args.attemptsLeft > 1;

  const posFreq = positionFrequencies(pool);

  if (n > 300 || !allowProbes) {
    const ranked = [...pool]
      .map((word) => ({
        word,
        raw: frequencyScore(word, posFreq),
        why: whyPool(word, clues),
      }))
      .sort((a, b) => b.raw - a.raw || a.word.localeCompare(b.word))
      .slice(0, count);
    return scaleBatch(ranked);
  }

  const poolSet = new Set(pool);
  const answersSet = new Set(args.answers);
  const eliminated = args.answers.filter((word) => !poolSet.has(word));
  const otherAllowed = [...args.allowed].filter((word) => !poolSet.has(word) && !answersSet.has(word));
  const probeCandidates = pickProbes(eliminated, otherAllowed, posFreq, 200);

  const poolRows = pool
    .map((word) => ({
      word,
      raw: expectedRemaining(word, pool),
      why: whyPool(word, clues),
      probe: false,
    }))
    .sort((a, b) => a.raw - b.raw || a.word.localeCompare(b.word));

  const probeRows = probeCandidates
    .map((word) => ({
      word,
      raw: expectedRemaining(word, pool),
      why: whyProbe(word),
      probe: true,
    }))
    .sort((a, b) => a.raw - b.raw || a.word.localeCompare(b.word));

  // A probe can have a lower expected-remaining than any pool word, but it cannot
  // win this turn. Lead with the best pool word so the agent has a playable guess
  // at rank 1 (the spec example ranks pool words above the probe).
  const rest = [...poolRows.slice(1), ...probeRows].sort(
    (a, b) => a.raw - b.raw || Number(a.probe) - Number(b.probe) || a.word.localeCompare(b.word),
  );
  const picked = [...(poolRows[0] ? [poolRows[0]] : []), ...rest].slice(0, count);
  return scaleByRank(picked);
}

function pickProbes(
  eliminatedAnswers: string[],
  otherAllowed: string[],
  posFreq: Map<string, number>[],
  limit: number,
): string[] {
  const byFreq = (words: string[]) =>
    words
      .map((word) => ({ word, raw: frequencyScore(word, posFreq) }))
      .sort((a, b) => b.raw - a.raw || a.word.localeCompare(b.word))
      .map((row) => row.word);
  const primary = byFreq(eliminatedAnswers);
  if (primary.length >= limit) return primary.slice(0, limit);
  return [...primary, ...byFreq(otherAllowed).slice(0, limit - primary.length)];
}

function expectedRemaining(guess: string, pool: string[]): number {
  const buckets = new Map<string, number>();
  for (const answer of pool) {
    const key = encodeFeedback(scoreGuess(guess, answer));
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  let sumSq = 0;
  for (const size of buckets.values()) sumSq += size * size;
  return sumSq / pool.length;
}

function frequencyScore(word: string, posFreq: Map<string, number>[]): number {
  const seen = new Set<string>();
  let score = 0;
  for (let i = 0; i < WORD_LENGTH; i++) {
    const ch = word[i];
    if (seen.has(ch)) continue;
    seen.add(ch);
    score += posFreq[i].get(ch) ?? 0;
  }
  return score;
}

function positionFrequencies(pool: string[]): Map<string, number>[] {
  const posFreq = Array.from({ length: WORD_LENGTH }, () => new Map<string, number>());
  for (const word of pool) {
    for (let i = 0; i < WORD_LENGTH; i++) {
      posFreq[i].set(word[i], (posFreq[i].get(word[i]) ?? 0) + 1);
    }
  }
  return posFreq;
}

function scaleByRank(ranked: { word: string; why: string }[]): Suggestion[] {
  if (ranked.length === 1) return [{ word: ranked[0].word, score: 1, why: ranked[0].why.slice(0, MAX_WHY) }];
  return ranked.map((row, i) => ({
    word: row.word,
    score: Math.round((1 - i / (ranked.length - 1)) * 100) / 100,
    why: row.why.slice(0, MAX_WHY),
  }));
}

function scaleBatch(ranked: { word: string; raw: number; why: string }[]): Suggestion[] {
  const values = ranked.map((row) => row.raw);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return ranked.map((row) => {
    let score = 1;
    if (max !== min) {
      score = (row.raw - min) / (max - min);
    }
    return {
      word: row.word,
      score: Math.round(score * 100) / 100,
      why: row.why.slice(0, MAX_WHY),
    };
  });
}

function whyOpener(word: string): string {
  const letters = [...new Set(word)].map((ch) => ch.toUpperCase()).join(", ");
  return `common opener; tests ${letters}`;
}

function whyPool(word: string, clues: Clues): string {
  const known = new Set<string>([...Object.values(clues.confirmed), ...clues.ruledOut]);
  const fresh = [...new Set(word)].filter((ch) => !known.has(ch)).map((ch) => ch.toUpperCase());
  if (fresh.length === 0) return "fits every clue";
  return `fits every clue; tests ${fresh.slice(0, 4).join(", ")}`;
}

function whyProbe(word: string): string {
  const letters = [...new Set(word)].map((ch) => ch.toUpperCase()).slice(0, 3).join(", ");
  return `cannot win, but tests ${letters}`;
}
