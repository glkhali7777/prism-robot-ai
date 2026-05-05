import { Brain } from "lucide-react";

export function PrismaLogo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="rounded-xl bg-gradient-prisma flex items-center justify-center shadow-glow"
      style={{ width: size, height: size }}
    >
      <Brain className="text-primary-foreground" style={{ width: size * 0.55, height: size * 0.55 }} />
    </div>
  );
}
