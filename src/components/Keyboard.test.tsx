import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { afterEach, describe, expect, it } from "vitest";
import { Keyboard } from "./Keyboard";

describe("Keyboard", () => {
  let host: HTMLDivElement;

  afterEach(() => {
    host.remove();
  });

  it("marks letter and delete keys with the typing cue", () => {
    host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    flushSync(() => {
      root.render(<Keyboard guesses={[]} onLetter={() => {}} onEnter={() => {}} onBackspace={() => {}} />);
    });

    expect(host.querySelectorAll('button[data-foley-press="thock"]')).toHaveLength(27);
    expect(host.querySelector("button[data-foley-press][data-foley-release]")?.textContent).toMatch(/enter/i);
    root.unmount();
  });
});
