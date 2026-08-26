import { allowed as allowedWords } from "../data/allowed";
import { answers as answerWords } from "../data/answers";

export type WordLists = {
  answers: readonly string[];
  allowed: ReadonlySet<string>;
};

export function loadWordLists(): WordLists {
  return { answers: answerWords, allowed: new Set(allowedWords) };
}
