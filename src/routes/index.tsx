import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Activity, Bell, BellOff, Lock, Save, Settings2, Trash2, Zap } from "lucide-react";
import { analyzeChart } from "@/server/analyze.functions";
import { ScreenCapture } from "@/components/prisma/ScreenCapture";
import { SignalCard, type Signal } from "@/components/prisma/SignalCard";
import { HistoryPanel, type HistoryEntry } from "@/components/prisma/HistoryPanel";
import { ReplayPanel } from "@/components/prisma/ReplayPanel";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadSession, saveSession, clearSession } from "@/lib/prisma-storage";
import { beep, ensureNotificationPermission, pushAlert } from "@/lib/prisma-notify";

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

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const fmt = now.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour12: false });
  return (
    <div className="font-mono text-sm tracking-widest text-foreground/90">
      <span className="text-gradient-prisma font-bold">{fmt}</span>
      <span className="text-[9px] text-muted-foreground ml-2 tracking-[0.3em]">BRT</span>
    </div>
  );
}

function Index() {
  const analyze = useServerFn(analyzeChart);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [autoOnCandle, setAutoOnCandle] = useState(true);
  const [timeframe, setTimeframe] = useState("1");
  const [expiry, setExpiry] = useState("5");
  const [sensitivity, setSensitivity] = useState<"low" | "medium" | "high">("medium");
  const [notifyOn, setNotifyOn] = useState(false);
  const lastAnalyzedCandleRef = useRef<number>(-1);
  const queueRef = useRef<string | null>(null);

  // hydrate
  useEffect(() => {
    const s = loadSession();
    if (s?.history) setHistory(s.history);
  }, []);

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
              return [entry, ...h].slice(0, 100);
            });
            beep(sig.direction);
            if (notifyOn) {
              pushAlert(
                `PRISMA IA · ${sig.direction}`,
                `${sig.asset ?? ""} · ${sig.confidence ?? 0}% · expira em ${sig.expiry_minutes ?? expiry}min`,
              );
            }
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
    [analyze, analyzing, timeframe, expiry, sensitivity, history, notifyOn],
  );

  const tfMin = parseInt(timeframe) || 1;
  const autoMs = useMemo(() => (autoOnCandle ? 2000 : null), [autoOnCandle]);

  const onFrame = useCallback(
    (img: string, source: "live" | "manual") => {
      if (source === "manual") {
        runAnalysis(img);
        return;
      }
      const now = new Date();
      const candleIdx = Math.floor((now.getHours() * 60 + now.getMinutes()) / tfMin);
      const sec = (now.getMinutes() % tfMin) * 60 + now.getSeconds();
      const isOpen = sec <= 4;
      if (isOpen && candleIdx !== lastAnalyzedCandleRef.current) {
        lastAnalyzedCandleRef.current = candleIdx;
        runAnalysis(img);
      }
    },
    [runAnalysis, tfMin],
  );

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

  const handleSave = () => {
    saveSession(history);
    toast.success("Sessão salva");
  };
  const handleClear = () => {
    setHistory([]);
    clearSession();
    toast.success("Sessão limpa");
  };
  const handleToggleNotify = async () => {
    if (notifyOn) {
      setNotifyOn(false);
      return;
    }
    const ok = await ensureNotificationPermission();
    setNotifyOn(ok);
    if (!ok) toast.error("Notificações bloqueadas pelo navegador");
    else toast.success("Notificações ativadas");
  };

  return (
    <main className="min-h-screen pb-12 bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PrismaLogo size={40} />
            <div>
              <h1 className="font-orbitron font-extrabold tracking-[0.25em] text-base leading-tight text-gradient-prisma">
                PRISMA IA
              </h1>
              <p className="text-[9px] tracking-[0.4em] text-muted-foreground uppercase mt-0.5">
                Agente Neural · Web
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-mono text-muted-foreground tracking-widest">PRÓX VELA</span>
              <span className="font-mono text-sm font-bold text-gradient-prisma">{countdown}s</span>
            </div>
            <Clock />
            <div className={`h-2 w-2 rounded-full ${analyzing ? "bg-accent pulse-glow" : "bg-success"}`} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* LEFT: control panel */}
        <aside className="space-y-5">
          <div className="bg-card rounded-2xl p-5 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="h-4 w-4 text-primary" />
              <h3 className="font-orbitron font-semibold tracking-widest text-xs">CONTROLES</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Timeframe</Label>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 min</SelectItem>
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Expiração</Label>
                <Select value={expiry} onValueChange={setExpiry}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 min</SelectItem>
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Sensibilidade</Label>
                <Select value={sensitivity} onValueChange={(v) => setSensitivity(v as any)}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-secondary/50 border border-border">
                <div className="flex items-center gap-2 text-xs">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span>Auto na vela</span>
                </div>
                <Switch checked={autoOnCandle} onCheckedChange={setAutoOnCandle} />
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-secondary/50 border border-border">
                <div className="flex items-center gap-2 text-xs">
                  {notifyOn ? <Bell className="h-3.5 w-3.5 text-primary" /> : <BellOff className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span>Notificações</span>
                </div>
                <Switch checked={notifyOn} onCheckedChange={handleToggleNotify} />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button onClick={handleSave} variant="outline" size="sm" className="rounded-full">
                <Save className="h-3.5 w-3.5 mr-1" /> Salvar
              </Button>
              <Button onClick={handleClear} variant="outline" size="sm" className="rounded-full text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Limpar
              </Button>
            </div>
          </div>

          <HistoryPanel entries={history} onMark={markResult} />
        </aside>

        {/* RIGHT: signals + replay */}
        <section className="space-y-5">
          <ScreenCapture onFrame={onFrame} isAnalyzing={analyzing} autoCaptureMs={autoMs} />

          <Tabs defaultValue="signal" className="w-full">
            <TabsList className="rounded-full bg-card border border-border p-1">
              <TabsTrigger value="signal" className="rounded-full text-xs font-display">SINAL ATUAL</TabsTrigger>
              <TabsTrigger value="replay" className="rounded-full text-xs font-display">REPLAY</TabsTrigger>
            </TabsList>
            <TabsContent value="signal" className="mt-4">
              <SignalCard signal={signal} />
            </TabsContent>
            <TabsContent value="replay" className="mt-4">
              <ReplayPanel entries={history} />
            </TabsContent>
          </Tabs>
        </section>
      </div>

      <footer className="max-w-7xl mx-auto px-6 mt-8 flex items-center justify-center gap-2 text-[10px] tracking-widest text-muted-foreground">
        <Lock className="h-3 w-3 text-success" />
        <span className="text-success">SSL Secured</span>
        <span>·</span>
        <span>Conexão Criptografada</span>
      </footer>
    </main>
  );
}
