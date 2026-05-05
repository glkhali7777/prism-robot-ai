import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Activity, Settings2, Zap } from "lucide-react";
import { analyzeChart } from "@/server/analyze.functions";
import { ScreenCapture } from "@/components/prisma/ScreenCapture";
import { SignalCard, type Signal } from "@/components/prisma/SignalCard";
import { HistoryPanel, type HistoryEntry } from "@/components/prisma/HistoryPanel";
import { PrismaLogo } from "@/components/prisma/PrismaLogo";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "PRISMA IA — Agente Neural de Trading" },
      {
        name: "description",
        content:
          "Agente neural com visão computacional para análise de opções binárias em tempo real. Detecta ativos OTC, lê velas e gera sinais CALL/PUT.",
      },
      { property: "og:title", content: "PRISMA IA — Trading com Visão Neural" },
    ],
  }),
});

function Index() {
  const analyze = useServerFn(analyzeChart);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [autoOnCandle, setAutoOnCandle] = useState(true);
  const [timeframe, setTimeframe] = useState("1");
  const [expiry, setExpiry] = useState("5");
  const [sensitivity, setSensitivity] = useState<"low" | "medium" | "high">("medium");
  const lastAnalyzedCandleRef = useRef<number>(-1);
  const queueRef = useRef<string | null>(null);

  // analysis runner
  const runAnalysis = useCallback(
    async (image: string) => {
      if (analyzing) {
        queueRef.current = image;
        return;
      }
      setAnalyzing(true);
      try {
        const res = await analyze({
          data: {
            image,
            timeframe: `${timeframe}m`,
            expiry,
            sensitivity,
            history: history.slice(-5).map((h) => ({
              direction: h.signal.direction === "WAIT" ? "CALL" : h.signal.direction,
              result: h.result,
              asset: h.signal.asset,
            })),
          },
        });
        if (!res.ok) {
          toast.error(res.error);
        } else {
          const sig = res.signal as Signal;
          setSignal(sig);
          if (sig.direction !== "WAIT") {
            setHistory((h) => {
              const entry: HistoryEntry = {
                id: crypto.randomUUID(),
                signal: sig,
                ts: Date.now(),
                result: "PENDING",
              };
              return [entry, ...h].slice(0, 50);
            });
            // optional sound
            try {
              const ctx = new AudioContext();
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.frequency.value = sig.direction === "CALL" ? 880 : 440;
              o.connect(g);
              g.connect(ctx.destination);
              g.gain.value = 0.05;
              o.start();
              o.stop(ctx.currentTime + 0.18);
            } catch {}
          }
        }
      } catch (e: any) {
        toast.error(e?.message ?? "Falha na análise");
      } finally {
        setAnalyzing(false);
        const q = queueRef.current;
        queueRef.current = null;
        if (q) runAnalysis(q);
      }
    },
    [analyze, analyzing, timeframe, expiry, sensitivity, history],
  );

  // candle-aligned auto capture window
  const tfMin = parseInt(timeframe) || 1;
  const autoMs = useMemo(() => {
    if (!autoOnCandle) return null;
    // sample every 2s; we'll filter in onFrame to fire near candle open
    return 2000;
  }, [autoOnCandle]);

  const onFrame = useCallback(
    (img: string, source: "live" | "manual") => {
      if (source === "manual") {
        runAnalysis(img);
        return;
      }
      // candle-open gating
      const now = new Date();
      const candleIdx = Math.floor(
        (now.getHours() * 60 + now.getMinutes()) / tfMin,
      );
      const sec = (now.getMinutes() % tfMin) * 60 + now.getSeconds();
      const isOpen = sec <= 4;
      if (isOpen && candleIdx !== lastAnalyzedCandleRef.current) {
        lastAnalyzedCandleRef.current = candleIdx;
        runAnalysis(img);
      }
    },
    [runAnalysis, tfMin],
  );

  // countdown to next candle
  const [countdown, setCountdown] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date();
      const sec = (d.getMinutes() % tfMin) * 60 + d.getSeconds();
      setCountdown(tfMin * 60 - sec);
    }, 1000);
    return () => clearInterval(t);
  }, [tfMin]);

  const markResult = (id: string, result: "WIN" | "LOSS") => {
    setHistory((h) => h.map((e) => (e.id === id ? { ...e, result } : e)));
  };

  return (
    <main className="min-h-screen pb-12">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PrismaLogo size={40} />
            <div>
              <h1 className="font-display font-extrabold tracking-widest text-lg leading-tight text-gradient-prisma">
                PRISMA IA
              </h1>
              <p className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
                Agente Neural · v2.0 Web
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full glass">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-mono">próx vela</span>
              <span className="font-mono text-sm font-bold text-gradient-prisma">{countdown}s</span>
            </div>
            <div className={`h-2 w-2 rounded-full ${analyzing ? "bg-accent pulse-glow" : "bg-success"}`} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* LEFT: capture + signal */}
        <div className="space-y-6">
          <ScreenCapture onFrame={onFrame} isAnalyzing={analyzing} autoCaptureMs={autoMs} />
          <SignalCard signal={signal} />

          {/* Settings */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="h-4 w-4 text-primary" />
              <h3 className="font-display font-semibold tracking-wide text-sm">CONFIGURAÇÕES</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Timeframe</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 minuto</SelectItem>
                    <SelectItem value="5">5 minutos</SelectItem>
                    <SelectItem value="15">15 minutos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Expiração</Label>
                <Select value={expiry} onValueChange={setExpiry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 min</SelectItem>
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Sensibilidade</Label>
                <Select value={sensitivity} onValueChange={(v) => setSensitivity(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Auto na vela</Label>
                  <div className="h-9 flex items-center gap-2 px-3 rounded-md bg-input border border-border">
                    <Switch checked={autoOnCandle} onCheckedChange={setAutoOnCandle} />
                    <span className="text-xs">{autoOnCandle ? "Ligado" : "Desligado"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: history + tips */}
        <aside className="space-y-6">
          <HistoryPanel entries={history} onMark={markResult} />
          <div className="glass rounded-2xl p-5 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Zap className="h-4 w-4" />
              <span className="font-display font-semibold tracking-wide text-foreground text-sm">
                COMO USAR
              </span>
            </div>
            <p>1. Clique em <b>Compartilhar tela</b> e selecione a aba do Quotex (ou outra plataforma).</p>
            <p>2. A IA detecta automaticamente o ativo selecionado (incluindo OTC), o timeframe e as velas.</p>
            <p>3. Sinais são gerados na <b>abertura de cada vela</b> — siga o CALL/PUT com a expiração indicada.</p>
            <p>4. Marque <b>WIN/LOSS</b> no histórico para a IA aprender o contexto.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
