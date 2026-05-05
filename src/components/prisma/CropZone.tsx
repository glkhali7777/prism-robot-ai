import { useRef, useState } from "react";
import { Crop, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CropRect = { x: number; y: number; w: number; h: number } | null;

export function CropZone({
  value,
  onChange,
}: {
  value: CropRect;
  onChange: (r: CropRect) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CropRect>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const onDown = (e: React.MouseEvent) => {
    if (!editing) return;
    const rect = ref.current!.getBoundingClientRect();
    startRef.current = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
    setDraft({ x: startRef.current.x, y: startRef.current.y, w: 0, h: 0 });
  };

  const onMove = (e: React.MouseEvent) => {
    if (!editing || !startRef.current) return;
    const rect = ref.current!.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width;
    const cy = (e.clientY - rect.top) / rect.height;
    const x = Math.min(startRef.current.x, cx);
    const y = Math.min(startRef.current.y, cy);
    setDraft({ x, y, w: Math.abs(cx - startRef.current.x), h: Math.abs(cy - startRef.current.y) });
  };

  const onUp = () => {
    if (!editing) return;
    startRef.current = null;
    if (draft && draft.w > 0.02 && draft.h > 0.02) {
      onChange(draft);
    }
    setEditing(false);
  };

  const display = draft ?? value;

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        ref={ref}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        className={`absolute inset-0 ${editing ? "pointer-events-auto cursor-crosshair" : ""}`}
      >
        {display && (
          <div
            className="absolute border-2 border-primary rounded-lg shadow-glow"
            style={{
              left: `${display.x * 100}%`,
              top: `${display.y * 100}%`,
              width: `${display.w * 100}%`,
              height: `${display.h * 100}%`,
              background: "hsl(263 70% 66% / 0.08)",
            }}
          >
            <span className="absolute -top-6 left-0 text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
              ZONA IA
            </span>
          </div>
        )}
      </div>
      <div className="absolute top-2 right-2 flex gap-2 pointer-events-auto">
        <Button
          size="sm"
          variant={editing ? "default" : "outline"}
          className="rounded-full h-8"
          onClick={() => {
            setDraft(null);
            setEditing((e) => !e);
          }}
        >
          <Crop className="h-3.5 w-3.5 mr-1" />
          {editing ? "Desenhe..." : value ? "Editar zona" : "Recortar"}
        </Button>
        {value && !editing && (
          <Button
            size="sm"
            variant="outline"
            className="rounded-full h-8 w-8 p-0"
            onClick={() => onChange(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
