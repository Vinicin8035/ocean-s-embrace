import type { GameState } from "./state";

const KEY = "a-deriva:save:v1";

export function saveGame(s: GameState) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, s, at: Date.now() }));
  } catch {
    /* armazenamento indisponível */
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v: number; s: GameState };
    if (!parsed?.s || parsed.v !== 1) return null;
    return parsed.s;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
