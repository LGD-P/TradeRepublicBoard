const EUR = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const SHARES = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 });

export function eur(v: number): string {
  return "€" + EUR.format(v);
}

/** Signed euro, e.g. "+€271.25" / "−€8.42". */
export function eurSigned(v: number): string {
  const s = v < 0 ? "−" : "+";
  return s + "€" + EUR.format(Math.abs(v));
}

export function pct(v: number): string {
  const s = v < 0 ? "−" : "+";
  return s + (Math.abs(v) * 100).toFixed(1) + "%";
}

export function shares(v: number): string {
  return SHARES.format(v);
}

export function toneClass(v: number): string {
  return v > 0 ? "gain" : v < 0 ? "loss" : "";
}
