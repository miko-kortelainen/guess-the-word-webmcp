export function Rules() {
  return (
    <section aria-label="How to play">
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted">How to play</h2>
      <p className="mt-2 text-sm text-muted">
        Guess the five-letter word in six tries. Each guess reveals which letters are in the word and where.
      </p>
      <ul className="mt-3 grid gap-2 text-sm">
        <li className="flex items-center gap-2">
          <span className="tile !h-7 !w-7 !text-xs" data-status="correct" aria-hidden="true">
            <span className="tile-letter">A</span>
          </span>
          <span><strong>Correct</strong> — letter is in the word and in the right spot.</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="tile !h-7 !w-7 !text-xs" data-status="present" aria-hidden="true">
            <span className="tile-letter">B</span>
          </span>
          <span><strong>Present</strong> — letter is in the word but in a different spot.</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="tile !h-7 !w-7 !text-xs" data-status="absent" aria-hidden="true">
            <span className="tile-letter">C</span>
          </span>
          <span><strong>Absent</strong> — letter is not in the word.</span>
        </li>
      </ul>
    </section>
  );
}
