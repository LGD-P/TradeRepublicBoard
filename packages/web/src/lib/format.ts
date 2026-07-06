import { get } from "svelte/store";

import { lang } from "./i18n";

function loc(): string {
  return get(lang) === "fr" ? "fr-FR" : "en-US";
}

/** Amount with two decimals, localised (no currency symbol). */
function dec(v: number): string {
  return new Intl.NumberFormat(loc(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}

/** Euro with the symbol AFTER the number (European convention): "72.34 €". */
export function eur(v: number): string {
  return dec(v) + " €";
}

/** Signed euro, e.g. "+271.25 €" / "−8.42 €" (localised). */
export function eurSigned(v: number): string {
  const sign = v < 0 ? "−" : "+";
  return sign + dec(Math.abs(v)) + " €";
}

/** Signed percent from a ratio (0.084 -> "+8.4%"). */
export function pct(v: number): string {
  const sign = v < 0 ? "−" : "+";
  return sign + new Intl.NumberFormat(loc(), {
    style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1,
  }).format(Math.abs(v));
}

export function shares(v: number): string {
  return new Intl.NumberFormat(loc(), { maximumFractionDigits: 4 }).format(v);
}

const MONTHS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  fr: ["Janv", "Févr", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"],
};

export function monthLabel(year: number, month: number): string {
  const l = get(lang) === "fr" ? "fr" : "en";
  return `${MONTHS[l][month - 1]} ${year}`;
}

export function toneClass(v: number): string {
  return v > 0 ? "gain" : v < 0 ? "loss" : "";
}
