const TZ = "America/Sao_Paulo";

const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: TZ });
const fullDate = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});

/** "agora", "há 5 min", "há 2 h", "ontem", then "12 de out." */
export function relative(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const diff = Math.round((t - now) / 1000);
  const abs = Math.abs(diff);
  if (abs < 45) return "agora";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 6) return rtf.format(Math.round(diff / 86400), "day");
  return shortDate.format(t).replace(".", "");
}

export function longDate(iso: string | null | undefined) {
  return iso ? fullDate.format(new Date(iso)) : "";
}

const dayDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });

/** "12 de outubro de 2026" */
export function fullDay(iso: string | null | undefined) {
  return iso ? dayDate.format(new Date(iso)) : "";
}

export function greeting(name: string) {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: TZ }).format(new Date()));
  const first = name.trim().split(/\s+/)[0] || "";
  const hello = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return first ? `${hello}, ${first}` : hello;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/** Only same-site paths: "//evil.com" or "/\evil.com" would leave the app after login. */
export function safePath(path: string | null | undefined, fallback = "/") {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return fallback;
  return path;
}

export function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;
}
