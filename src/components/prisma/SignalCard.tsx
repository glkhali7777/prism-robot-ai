import { ArrowDown, ArrowUp, Clock, Pause, Sparkles } from "lucide-react";

export type Signal = {
  asset?: string;
  timeframe?: string;
  direction: "CALL" | "PUT" | "WAIT";
  confidence?: number;
  expiry_minutes?: number;
  reasoning?: string;
  signals?: string[];
  candle_pattern?: string | null;
  trend?: string;
  risk?: string;
  next_candle_seconds?: number;
};

const styles = {
  CALL: {
    label: "PARA CIMA",
    icon: ArrowUp,
    color: "var(--success)",
    bg: "bg-[oklch(0.72_0.2_155/0.1)]",
    border: "border-[oklch(0.72_0.2_155/0.4)]",
    text: "text-[oklch(0.72_0.2_155)]",
  },
  PUT: {
    label: "PARA BAIXO",
    icon: ArrowDown,
    color: "var(--destructive)",
    bg: "bg-[oklch(0.62_0.25_22/0.1)]",
    border: "border-[oklch(0.62_0.25_22/0.4)]",
    text: "text-[oklch(0.62_0.25_22)]",
  },
  WAIT: {
    label: "AGUARDAR",
    icon: Pause,
    color: "var(--muted-foreground)",
    bg: "bg-muted/40",
    border: "border-border",
    text: "text-muted-foreground",
  },
} as const;

export function SignalCard({ signal }: { signal: Signal | null }) {
  if (!signal) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <Sparkles className="h-10 w-10 mx-auto text-primary/60 mb-3" />
        <p className="text-sm text-muted-foreground">Aguardando primeira análise...</p>
      </div>
    );
  }
  const s = styles[signal.direction];
  const Icon = s.icon;
  const conf = signal.confidence ?? 0;

  return (
    <div className={`glass rounded-2xl border ${s.border} ${s.bg} p-6 shadow-glow-strong relative overflow-hidden`}>
      <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-mono tracking-widest bg-gradient-prisma text-primary-foreground rounded-bl-lg">
        PRISMA IA
      </div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Ativo detectado</p>
          <h2 className="font-display text-2xl font-bold">{signal.asset ?? "—"}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {signal.timeframe ?? "1m"} · expira em {signal.expiry_minutes ?? 5}min
          </p>
        </div>
        {signal.next_candle_seconds != null && (
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> próxima vela
            </div>
            <div className="font-mono text-2xl font-bold text-gradient-prisma">
              {signal.next_candle_seconds}s
            </div>
          </div>
        )}
      </div>

      <div className={`flex items-center justify-center gap-3 py-6 rounded-xl ${s.bg} border ${s.border} mb-4`}>
        <Icon className={`h-12 w-12 ${s.text}`} strokeWidth={2.5} />
        <div>
          <div className={`font-display text-3xl font-extrabold ${s.text}`}>{s.label}</div>
          <div className="text-xs text-muted-foreground">Confiança: {conf}%</div>
        </div>
      </div>

      {signal.reasoning && (
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">{signal.reasoning}</p>
      )}

      {signal.signals && signal.signals.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {signal.signals.map((sig, i) => (
            <span key={i} className="text-[11px] px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary">
              {sig}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 text-[11px] text-muted-foreground">
        {signal.trend && <span className="px-2 py-1 rounded bg-secondary/50">tendência: {signal.trend}</span>}
        {signal.candle_pattern && <span className="px-2 py-1 rounded bg-secondary/50">padrão: {signal.candle_pattern}</span>}
        {signal.risk && <span className="px-2 py-1 rounded bg-secondary/50">risco: {signal.risk}</span>}
      </div>
    </div>
  );
}
