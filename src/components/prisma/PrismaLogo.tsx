export function PrismaLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 0 12px hsl(263 70% 66% / 0.6))" }}
    >
      <defs>
        <linearGradient id="prisma-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="hsl(292 84% 61%)" />
          <stop offset="1" stopColor="hsl(263 70% 66%)" />
        </linearGradient>
      </defs>
      <path
        d="M32 6 L58 52 L6 52 Z"
        stroke="url(#prisma-grad)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M32 6 L32 52" stroke="url(#prisma-grad)" strokeWidth="1.5" opacity="0.55" />
      <path d="M32 6 L20 52" stroke="url(#prisma-grad)" strokeWidth="1" opacity="0.4" />
      <path d="M32 6 L44 52" stroke="url(#prisma-grad)" strokeWidth="1" opacity="0.4" />
      <circle cx="32" cy="32" r="3" fill="url(#prisma-grad)" />
    </svg>
  );
}
