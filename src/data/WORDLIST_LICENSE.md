# Word list source and licence

This file records where the puzzle words come from, the licences those
sources use, and the exact derivation steps. The shipped files are
`answers.ts` (targets) and `allowed.ts` (accepted guesses).

## What ships

- `answers.ts` — 2,202 common five-letter English words used as puzzle
  targets. Every answer is also in `allowed.ts`.
- `allowed.ts` — 15,913 five-letter alphabetic words accepted as guesses.

Neither list is taken from a proprietary game. Both are derived from
sources whose licences were read in full before these files were
generated.

## Source 1 — word strings (Unlicense)

**Upstream:** [dwyl/english-words](https://github.com/dwyl/english-words),
file `words_alpha.txt`.

**Licence:** The Unlicense (public domain dedication). The upstream
`LICENSE.md` text, retrieved 2026-08-26:

> This is free and unencumbered software released into the public domain.
>
> Anyone is free to copy, modify, publish, use, compile, sell, or
> distribute this software, either in source code form or as a compiled
> binary, for any purpose, commercial or non-commercial, and by any
> means.
>
> In jurisdictions that recognize copyright laws, the author or authors
> of this software dedicate any and all copyright interest in the
> software to the public domain. We make this dedication for the benefit
> of the public at large and to the detriment of our heirs and
> successors. We intend this dedication to be an overt act of
> relinquishment in perpetuity of all present and future rights to this
> software under copyright law.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
> EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
> MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
> IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
> OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
> ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
> OTHER DEALINGS IN THE SOFTWARE.
>
> For more information, please refer to <https://unlicense.org>

Every string in `allowed.ts` (and therefore every string in `answers.ts`)
is a five-letter word taken from this list.

## Source 2 — frequency ranking only (not redistributed)

**Upstream:** Peter Norvig, *Natural Language Corpus Data*,
[`count_1w.txt`](https://norvig.com/ngrams/count_1w.txt).

Norvig describes the file as the 1/3 million most frequent words derived
from the Google Web Trillion Word Corpus (Brants and Franz; distributed
by the Linguistic Data Consortium). His code on that page is MIT-licensed.
The frequency file itself is **not** copied into this repository. It is
used only as a ranking signal: public-domain words that appear earlier in
`count_1w.txt` are preferred as puzzle targets so the game stays fair.

## Derivation

Run by `scripts/generate-wordlists.mjs`:

1. Read `words_alpha.txt`. Keep tokens matching `^[a-z]{5}$` that contain
   at least one of `aeiouy`. Lowercase. Deduplicate. Sort. This is
   `allowed.ts`.
2. Read `count_1w.txt` in frequency order. Keep five-letter tokens that
   are in the allowed set and are not on a small blocklist of slang and
   abusive words.
3. Take the first 2,200 of those ranked words as `answers.ts`. Force-include
   a handful of common words used by the test suite if they were just
   outside the cut (`abbey`, `alloy`, `speed`, `crane`, `llama`, `erase`,
   `eerie`, `guard`, `award`, `dwarf`, `solid`, `babes`).
4. Score every answer with a positional letter-frequency heuristic over
   the answer list (each distinct letter counted once). The top eight
   words become the hardcoded first-move opener list in
   `src/game/openers.ts`.

To regenerate, download the two upstream files and run:

```bash
curl -fsSL -o /tmp/words-alpha.txt https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt
curl -fsSL -o /tmp/count_1w.txt https://norvig.com/ngrams/count_1w.txt
node scripts/generate-wordlists.mjs
```
