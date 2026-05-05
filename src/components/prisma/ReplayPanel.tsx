import { useState } from "react";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";
import type { HistoryEntry } from "./HistoryPanel";
import { SignalCard } from "./SignalCard";
import { Button } from "@/components/ui/button";

export function ReplayPanel({ entries }: { entries: HistoryEntry[] }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const ordered = [...entries].reverse(); // oldest first

  if (ordered.length === 0) {
    return (
      <div className="glass rounded-2xl p-5 text-center text-xs text-muted-foreground">
        Sem sinais para revisar ainda.
      </div>
    );
  }

  const current = ordered[Math.min(idx, ordered.length - 1)];

  const next = () => setIdx((i) => Math.min(i + 1, ordered.length - 1));
  const prev = () => setIdx((i) => Math.max(i - 1, 0));

  // simple play loop
  if (playing) {
    setTimeout(() => {
      if (idx < ordered.length - 1) setIdx((i) => i + 1);
      else setPlaying(false);
    }, 1200);
  }

  return (
    <div className="space-y-3">
      <div className="glass rounded-2xl p-3 flex items-center gap-2">
        <Button size="sm" variant="outline" className="rounded-full h-8 w-8 p-0" onClick={prev}>
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          className="rounded-full h-8 w-8 p-0 bg-gradient-prisma"
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="outline" className="rounded-full h-8 w-8 p-0" onClick={next}>
          <SkipForward className="h-4 w-4" />
        </Button>
        <div className="flex-1 text-xs text-muted-foreground font-mono ml-2">
          {idx + 1} / {ordered.length} · {new Date(current.ts).toLocaleTimeString("pt-BR")}
        </div>
      </div>
      <SignalCard signal={current.signal} />
    </div>
  );
}
