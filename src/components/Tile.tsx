import type { LetterStatus, Player } from "../game/types";

type TileStatus = LetterStatus | "empty" | "tbd" | "proposal";

type Props = {
  letter: string;
  status: TileStatus;
  row: number;
  col: number;
  by?: Player;
  revealed?: boolean;
  delayMs?: number;
};

function statusPhrase(letter: string, status: TileStatus): string {
  if (!letter || status === "empty") return "empty";
  const ch = letter.toUpperCase();
  if (status === "tbd") return `${ch}, typed`;
  if (status === "proposal") return `${ch}, proposed by agent`;
  if (status === "correct") return `${ch}, correct position`;
  if (status === "present") return `${ch}, present, wrong position`;
  return `${ch}, absent from the word`;
}

export function Tile({ letter, status, row, col, by, revealed, delayMs = 0 }: Props) {
  const label = `Row ${row}, position ${col}: ${statusPhrase(letter, status)}`;
  return (
    <div
      role="gridcell"
      aria-label={label}
      className={revealed ? "tile is-revealed" : "tile"}
      data-status={status === "empty" ? undefined : status}
      data-by={by === "agent" && status !== "empty" && status !== "tbd" && status !== "proposal" ? "agent" : undefined}
      style={revealed ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      <span className="tile-letter" aria-hidden="true">
        {letter}
      </span>
    </div>
  );
}
