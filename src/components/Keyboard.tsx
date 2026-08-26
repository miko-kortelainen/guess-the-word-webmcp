import type { GuessResult, LetterStatus } from "../game/types";

const ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
] as const;

const RANK: Record<LetterStatus, number> = { correct: 3, present: 2, absent: 1 };

function bestKeyStatus(guesses: GuessResult[]): Record<string, LetterStatus> {
  const best: Record<string, LetterStatus> = {};
  for (const guess of guesses) {
    guess.word.split("").forEach((ch, i) => {
      const status = guess.feedback[i];
      if (!best[ch] || RANK[status] > RANK[best[ch]]) best[ch] = status;
    });
  }
  return best;
}

type Props = {
  guesses: GuessResult[];
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  disabled?: boolean;
};

export function Keyboard({ guesses, onLetter, onEnter, onBackspace, disabled }: Props) {
  const status = bestKeyStatus(guesses);

  return (
    <div className="mt-5 flex flex-col items-center gap-1.5" aria-label="On-screen keyboard">
      {ROWS.map((row, index) => (
        <div key={row.join("")} className="flex justify-center gap-1">
          {index === 2 ? (
            <button type="button" className="key px-2 text-xs" onClick={onEnter} disabled={disabled}>
              Enter
            </button>
          ) : null}
          {row.map((letter) => (
            <button
              key={letter}
              type="button"
              className="key"
              data-status={status[letter]}
              onClick={() => onLetter(letter)}
              disabled={disabled}
              aria-label={
                status[letter]
                  ? `${letter.toUpperCase()}, ${status[letter]}`
                  : letter.toUpperCase()
              }
            >
              {letter}
            </button>
          ))}
          {index === 2 ? (
            <button
              type="button"
              className="key px-2 text-xs"
              onClick={onBackspace}
              disabled={disabled}
            >
              Delete
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
