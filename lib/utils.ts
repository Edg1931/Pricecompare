import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | null | undefined, currency = "USD") {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const intervals: [number, string][] = [
    [31536000, "year"],
    [2592000, "month"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [secs, label] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

/**
 * Reads a fetch Response as JSON, turning non-OK and non-JSON responses
 * (e.g. Vercel's plain-text "Request Entity Too Large") into clear errors.
 */
export async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!res.ok) {
    let message = `Request failed (${res.status}).`;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j?.error) message = j.error;
    } catch {
      if (res.status === 413) {
        message = "That photo is too large to upload. Try a smaller image.";
      } else if (text) {
        message = text.slice(0, 140);
      }
    }
    throw new Error(message);
  }
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error("Unexpected response from the server.");
  }
}

/**
 * Sends a JSON mutation (POST/PATCH/DELETE) and throws a useful Error when the
 * server responds non-OK, so callers can surface failures instead of silently
 * showing success.
 */
export async function sendJson(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method,
    ...(body !== undefined
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  });
  return readJson(res);
}

export function errorMessage(err: unknown, fallback = "Something went wrong."): string {
  return err instanceof Error ? err.message : fallback;
}
