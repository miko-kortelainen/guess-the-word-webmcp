import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  label: string;
  badge?: string;
  align?: "left" | "right";
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
};

export function HeaderMenu({ open, label, badge, align = "right", onToggle, onClose, children }: Props) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    }

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
      buttonRef.current?.focus();
    }

    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={onToggle}
        data-foley-click
        className="inline-flex min-w-[8rem] items-center justify-center gap-1.5 border border-line bg-transparent px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em]"
      >
        {label}
        {badge ? <span className="border border-line px-1 py-0.5 font-mono text-[9px] tracking-normal">{badge}</span> : null}
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={label}
          className={`menu-panel menu-panel-${align}`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
