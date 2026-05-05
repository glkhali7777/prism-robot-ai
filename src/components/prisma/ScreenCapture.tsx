import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, MonitorPlay, Square, Upload, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CropZone, type CropRect } from "./CropZone";

type Props = {
  onFrame: (dataUrl: string, source: "live" | "manual") => void;
  isAnalyzing: boolean;
  autoCaptureMs: number | null;
};

export function ScreenCapture({ onFrame, isAnalyzing, autoCaptureMs }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [crop, setCrop] = useState<CropRect>(null);

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
      toast.success("Captura iniciada — selecione a aba do gráfico");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível iniciar a captura");
    }
  }, [stop]);

  const grabFrame = useCallback((): string | null => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const canvas = document.createElement("canvas");
    let sx = 0, sy = 0, sw = v.videoWidth, sh = v.videoHeight;
    if (crop) {
      sx = Math.floor(crop.x * v.videoWidth);
      sy = Math.floor(crop.y * v.videoHeight);
      sw = Math.max(64, Math.floor(crop.w * v.videoWidth));
      sh = Math.max(64, Math.floor(crop.h * v.videoHeight));
    }
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, sw, sh);
    return canvas.toDataURL("image/jpeg", 0.78);
  }, [crop]);

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
    <div className="bg-card rounded-2xl overflow-hidden border border-border">
      <div className="flex items-center justify-between p-4 border-b border-border flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${streaming ? "bg-success pulse-glow" : "bg-muted-foreground"}`} />
          <h3 className="font-display font-semibold tracking-wider text-sm">
            {streaming ? "AO VIVO" : "VISÃO DA IA"}
          </h3>
          {isAnalyzing && <span className="text-xs text-primary animate-pulse ml-2">analisando...</span>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {!streaming ? (
            <Button size="sm" onClick={start} className="rounded-full bg-gradient-prisma text-primary-foreground hover:opacity-90 shadow-glow">
              <MonitorPlay className="h-4 w-4 mr-1" /> Compartilhar tela
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={stop} className="rounded-full">
              <Square className="h-4 w-4 mr-1" /> Parar
            </Button>
          )}
          {streaming && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
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
            <Button size="sm" variant="outline" className="rounded-full" asChild>
              <span className="cursor-pointer"><Upload className="h-4 w-4 mr-1" /> Print</span>
            </Button>
          </label>
        </div>
      </div>
      <div className="relative aspect-video bg-black">
        <video ref={videoRef} className="w-full h-full object-contain" muted playsInline />
        {!streaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Camera className="h-12 w-12 opacity-40" />
            <p className="text-sm max-w-xs text-center px-6">
              Compartilhe a tela do gráfico para a IA detectar ativo, velas e gerar sinais ao vivo.
            </p>
          </div>
        )}
        {streaming && <CropZone value={crop} onChange={setCrop} />}
        {isAnalyzing && streaming && <div className="absolute inset-0 scan-line" />}
      </div>
    </div>
  );
}
