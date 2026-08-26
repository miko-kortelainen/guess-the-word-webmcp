import type { GameState } from "../game/types";

type Props = {
  state: GameState;
  message: string;
};

export function GameStatus({ state, message }: Props) {
  let headline = `${state.attemptsRemaining} attempt${state.attemptsRemaining === 1 ? "" : "s"} left`;
  if (state.status === "won") headline = "You got it.";
  if (state.status === "lost") headline = `The word was ${state.revealedTarget?.toUpperCase() ?? ""}.`;

  return (
    <div className="mb-5 text-center">
      <p className="text-sm font-bold tracking-tight">{headline}</p>
      <p className="mt-1 min-h-5 text-sm text-muted">{message}</p>
    </div>
  );
}
