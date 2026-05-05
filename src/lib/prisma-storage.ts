import type { HistoryEntry } from "@/components/prisma/HistoryPanel";

const KEY = "prisma:session:v1";

export type Session = {
  history: HistoryEntry[];
  savedAt: number;
};

export function loadSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function saveSession(history: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ history, savedAt: Date.now() } satisfies Session));
  } catch {}
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
