import type { Mode } from "../game/types";

const OPTIONS: { value: Mode; label: string; hint: string }[] = [
  { value: "solo", label: "Observe", hint: "Agent can inspect, not move" },
  { value: "copilot", label: "Co-pilot", hint: "Agent proposes; you approve" },
  { value: "autonomous", label: "Autonomous", hint: "Agent may play guesses" },
];

type Props = {
  mode: Mode;
  onChange: (mode: Mode) => void;
};

export function ModeSwitch({ mode, onChange }: Props) {
  return (
    <fieldset>
      <legend className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Agent authority</legend>
      <div role="radiogroup" aria-label="Agent authority" className="mt-3 grid gap-2">
        {OPTIONS.map((option) => {
          const selected = mode === option.value;
          return (
            <label
              key={option.value}
              data-foley-click
              className={`flex cursor-pointer items-start gap-2 border px-3 py-2 ${
                selected ? "border-brand" : "border-line"
              }`}
            >
              <input
                type="radio"
                name="agent-mode"
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-bold">{option.label}</span>
                <span className="block text-xs text-muted">{option.hint}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
