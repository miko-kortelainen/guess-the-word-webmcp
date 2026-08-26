import { GameEngine } from "./engine";
import { loadWordLists } from "./dictionary";

export const engine = new GameEngine(loadWordLists());
