import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(input: string | Date, locale = "fr-FR"): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(input: string | Date, locale = "fr-FR"): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(input: string | Date, locale = "fr-FR"): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "à l'instant";
  if (diffSec < 3600) return `il y a ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `il y a ${Math.floor(diffSec / 3600)} h`;
  if (diffSec < 604800) return `il y a ${Math.floor(diffSec / 86400)} j`;
  return formatDate(d, locale);
}

export function maskNeph(neph: string): string {
  if (!neph || neph.length < 6) return neph;
  return neph.slice(0, 4) + "•".repeat(Math.max(0, neph.length - 8)) + neph.slice(-4);
}
