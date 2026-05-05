import { Check, X, Clock } from "lucide-react";
import type { Signal } from "./SignalCard";

export type HistoryEntry = {
  id: string;
  signal: Signal;
  ts: number;
  result: "WIN" | "LOSS" | "PENDING";
};

export function HistoryPanel({
  entries,
  onMark,
}: {
  entries: HistoryEntry[];
  onMark: (id: string, result: "WIN" | "LOSS") => void;
}) {
  const wins = entries.filter((e) => e.result === "WIN").length;
  const losses = entries.filter((e) => e.result === "LOSS").length;
  const total = wins + losses;
  const rate = total ? Math.round((wins / total) * 100) : 0;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold tracking-wide text-sm">HISTÓRICO</h3>
        <div className="flex gap-3 text-xs">
          <span className="text-success">✓ {wins}</span>
          <span className="text-destructive">✗ {losses}</span>
          <span className="text-gradient-prisma font-bold">{rate}%</span>
        </div>
      </div>
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhum sinal ainda</p>
        )}
        {entries.map((e) => {
          const isCall = e.signal.direction === "CALL";
          const isWait = e.signal.direction === "WAIT";
          return (
            <div
              key={e.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30 border border-border/50"
            >
              <div
                className={`h-8 w-8 rounded-md flex items-center justify-center text-[10px] font-bold ${
                  isWait
                    ? "bg-muted text-muted-foreground"
                    : isCall
                      ? "bg-[oklch(0.72_0.2_155/0.2)] text-[oklch(0.72_0.2_155)]"
                      : "bg-[oklch(0.62_0.25_22/0.2)] text-[oklch(0.62_0.25_22)]"
                }`}
              >
                {e.signal.direction}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{e.signal.asset ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(e.ts).toLocaleTimeString("pt-BR")} · {e.signal.confidence ?? 0}%
                </p>
              </div>
              {!isWait && e.result === "PENDING" ? (
                <div className="flex gap-1">
                  <button
                    onClick={() => onMark(e.id, "WIN")}
                    className="h-7 w-7 rounded-md bg-success/20 hover:bg-success/30 text-success flex items-center justify-center"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onMark(e.id, "LOSS")}
                    className="h-7 w-7 rounded-md bg-destructive/20 hover:bg-destructive/30 text-destructive flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : e.result === "PENDING" ? (
                <Clock className="h-4 w-4 text-muted-foreground" />
              ) : e.result === "WIN" ? (
                <Check className="h-5 w-5 text-success" />
              ) : (
                <X className="h-5 w-5 text-destructive" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
