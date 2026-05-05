export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const r = await Notification.requestPermission();
  return r === "granted";
}

export function pushAlert(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico", silent: false });
  } catch {}
}

export function beep(direction: "CALL" | "PUT") {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = direction === "CALL" ? 880 : 440;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.value = 0.06;
    o.start();
    o.stop(ctx.currentTime + 0.22);
  } catch {}
}
