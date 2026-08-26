import { TILE_REVEAL_STAGGER_MS } from "../foley/sounds";
import { MAX_ATTEMPTS, WORD_LENGTH, type GameState } from "../game/types";
import { Tile } from "./Tile";

type Props = {
  state: GameState;
  draft: string;
  onAccept: () => void;
  onReject: () => void;
};

export function Board({ state, draft, onAccept, onReject }: Props) {
  const currentRow = state.guesses.length;
  const proposal = state.pendingProposal;
  const showProposal = proposal && state.status === "playing" && currentRow < MAX_ATTEMPTS;

  return (
    <div>
      <div
        id="board"
        role="grid"
        aria-label="Guess board, six rows of five letters"
        aria-rowcount={MAX_ATTEMPTS}
        aria-colcount={WORD_LENGTH}
        className="grid justify-center gap-1.5"
      >
        {Array.from({ length: MAX_ATTEMPTS }, (_, rowIndex) => {
          const guess = state.guesses[rowIndex];
          const isCurrent = rowIndex === currentRow && state.status === "playing";
          const isProposalRow = showProposal && rowIndex === currentRow;
          return (
            <div
              key={rowIndex}
              role="row"
              aria-label={`Row ${rowIndex + 1}${guess?.by === "agent" ? ", played by the agent" : ""}${
                isProposalRow ? ", proposed by the agent, awaiting your decision" : ""
              }`}
              className={isProposalRow ? "relative mx-auto w-fit" : "grid grid-cols-5 gap-1.5"}
            >
              {isProposalRow ? (
                <>
                  <button
                    type="button"
                    onClick={onReject}
                    aria-label="Reject proposed guess"
                    className="proposal-btn absolute right-full top-0 mr-1.5"
                    data-foley-click="denied"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: WORD_LENGTH }, (_, colIndex) => (
                      <Tile
                        key={colIndex}
                        letter={proposal!.word[colIndex] ?? ""}
                        status="proposal"
                        row={rowIndex + 1}
                        col={colIndex + 1}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={onAccept}
                    aria-label="Accept proposed guess"
                    className="proposal-btn proposal-btn-accept absolute left-full top-0 ml-1.5"
                    data-foley-click
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  {Array.from({ length: WORD_LENGTH }, (_, colIndex) => {
                    if (guess) {
                      return (
                        <Tile
                          key={colIndex}
                          letter={guess.word[colIndex]}
                          status={guess.feedback[colIndex]}
                          row={rowIndex + 1}
                          col={colIndex + 1}
                          by={guess.by}
                          revealed
                          delayMs={colIndex * TILE_REVEAL_STAGGER_MS}
                        />
                      );
                    }
                    const ch = isCurrent ? draft[colIndex] ?? "" : "";
                    return (
                      <Tile
                        key={colIndex}
                        letter={ch}
                        status={ch ? "tbd" : "empty"}
                        row={rowIndex + 1}
                        col={colIndex + 1}
                      />
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>
      {showProposal && proposal?.reason ? (
        <p className="mx-auto mt-2 max-w-[17.75rem] text-center text-xs text-muted">
          {proposal.reason}
        </p>
      ) : null}
    </div>
  );
}
