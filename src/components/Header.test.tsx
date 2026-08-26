import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Header } from "./Header";

describe("Header mute toggle", () => {
  let host: HTMLDivElement;

  afterEach(() => {
    host.remove();
  });

  function render(muted: boolean) {
    host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    flushSync(() => {
      root.render(
        <Header
          mode="copilot"
          entries={[]}
          muted={muted}
          onMode={() => {}}
          onToggleMute={vi.fn()}
          onNewGame={() => {}}
        />,
      );
    });
    return root;
  }

  it("shows an icon-only mute button", () => {
    const root = render(false);
    const button = host.querySelector('button[aria-label="Mute sounds"]');
    expect(button).not.toBeNull();
    expect(button?.getAttribute("aria-pressed")).toBe("false");
    expect(button?.getAttribute("data-foley-press")).toBe("press");
    expect(button?.getAttribute("data-foley-release")).toBe("release");
    expect(button?.querySelectorAll("svg")).toHaveLength(2);
    root.unmount();
  });

  it("marks the button pressed when muted", () => {
    const root = render(true);
    const button = host.querySelector('button[aria-label="Unmute sounds"]');
    expect(button?.getAttribute("aria-pressed")).toBe("true");
    expect(button?.getAttribute("data-foley-press")).toBe("press");
    root.unmount();
  });

  it("places the mute button after New game", () => {
    const root = render(false);
    const buttons = [...host.querySelectorAll("header button")];
    const newGame = buttons.findIndex((button) => button.textContent === "New game");
    const mute = buttons.findIndex((button) => button.getAttribute("aria-label") === "Mute sounds");
    expect(mute).toBe(newGame + 1);
    root.unmount();
  });
});
