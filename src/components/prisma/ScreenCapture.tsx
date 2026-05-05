import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, MonitorPlay, Square, Upload, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  onFrame: (dataUrl: string, source: "live" | "manual") => void;
  isAnalyzing: boolean;
  autoCaptureMs: number | null; // when set, captures every X ms
};

export function ScreenCapture({ onFrame, isAnalyzing, autoCaptureMs }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [streaming, setStreaming] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStreaming(false);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 5 } as MediaTrackConstraints,
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      stream.getVideoTracks()[0].addEventListener("ended", stop);
      setStreaming(true);
      toast.success("Captura iniciada — selecione a aba do Quotex");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível iniciar a captura");
    }
  }, [stop]);

  const grabFrame = useCallback((): string | null => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.78);
  }, []);

  // auto capture
  useEffect(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streaming && autoCaptureMs) {
      intervalRef.current = window.setInterval(() => {
        const url = grabFrame();
        if (url) onFrame(url, "live");
      }, autoCaptureMs);
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [streaming, autoCaptureMs, grabFrame, onFrame]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => onFrame(String(r.result), "manual");
    r.readAsDataURL(f);
    e.target.value = "";
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${streaming ? "bg-success pulse-glow" : "bg-muted-foreground"}`} />
          <h3 className="font-display font-semibold tracking-wide text-sm">
            {streaming ? "AO VIVO" : "VISÃO DA IA"}
          </h3>
          {isAnalyzing && <span className="text-xs text-primary animate-pulse ml-2">analisando...</span>}
        </div>
        <div className="flex gap-2">
          {!streaming ? (
            <Button size="sm" onClick={start} className="bg-gradient-prisma text-primary-foreground hover:opacity-90">
              <MonitorPlay className="h-4 w-4 mr-1" /> Compartilhar tela
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={stop}>
              <Square className="h-4 w-4 mr-1" /> Parar
            </Button>
          )}
          {streaming && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const url = grabFrame();
                if (url) onFrame(url, "live");
              }}
            >
              <Zap className="h-4 w-4 mr-1" /> Analisar agora
            </Button>
          )}
          <label>
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            <Button size="sm" variant="outline" asChild>
              <span className="cursor-pointer"><Upload className="h-4 w-4 mr-1" /> Print</span>
            </Button>
          </label>
        </div>
      </div>
      <div className="relative aspect-video bg-black/60">
        <video ref={videoRef} className="w-full h-full object-contain" muted playsInline />
        {!streaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Camera className="h-12 w-12 opacity-40" />
            <p className="text-sm max-w-xs text-center px-6">
              Compartilhe a aba do Quotex para a IA ler o gráfico, detectar o ativo (mesmo OTC), velas e gerar sinais ao vivo.
            </p>
          </div>
        )}
        {isAnalyzing && streaming && <div className="absolute inset-0 scan-line" />}
      </div>
    </div>
  );
}
