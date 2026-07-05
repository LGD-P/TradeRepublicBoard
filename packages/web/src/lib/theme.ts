import { get, writable } from "svelte/store";

function init(): string {
  if (typeof localStorage !== "undefined") return localStorage.getItem("theme") ?? "light";
  return "light";
}

export const theme = writable<string>(init());

export function applyTheme(v: string): void {
  theme.set(v);
  if (typeof document !== "undefined") document.documentElement.setAttribute("data-theme", v);
  if (typeof localStorage !== "undefined") localStorage.setItem("theme", v);
}

export function toggleTheme(): void {
  applyTheme(get(theme) === "dark" ? "light" : "dark");
}
