// app/(Dashboard)/admin/components/utils.ts

import { EventDetail } from "./types";

export function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

/** Rupiah hanya ASCII (contoh Rp1.700.000) — untuk ESC/POS: hindari NBSP/narrow space setelah "Rp" yang jadi karakter rusak di printer. */
export function formatRupiahAscii(value: number): string {
  const n = Math.round(Number(value || 0));
  return `Rp${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export function parseEventDetails(eventDetails: unknown): EventDetail[] {
  const normalize = (raw: EventDetail): EventDetail => {
    const rawDate = String(raw.date || "");
    const rawTime = String(raw.time || raw.startTime || "");
    const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
      ? rawDate
      : rawDate
      ? new Date(rawDate).toISOString().slice(0, 10)
      : "";
    const normalizedTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(rawTime)
      ? rawTime
      : /^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(rawTime)
      ? rawTime.slice(0, 5)
      : "";

    return {
      ...raw,
      date: Number.isNaN(new Date(normalizedDate).getTime()) && normalizedDate ? "" : normalizedDate,
      time: normalizedTime,
      title: String(raw.title || raw.eventName || ""),
      address: String(raw.address || ""),
    };
  };

  if (!eventDetails) return [];
  if (typeof eventDetails === "string") {
    try {
      const parsed = JSON.parse(eventDetails) as unknown;
      return Array.isArray(parsed) ? (parsed as EventDetail[]).map((item) => normalize(item)) : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(eventDetails)
    ? (eventDetails as EventDetail[]).map((item) => normalize(item))
    : [normalize(eventDetails as EventDetail)];
}

export function getNearestEventDate(eventDetails: unknown) {
  const list = parseEventDetails(eventDetails);
  const timestamps = list
    .map((event) => event?.date)
    .filter(Boolean)
    // PERBAIKAN: Menghapus ': string' agar TypeScript di Netlify tidak protes
    .map((dateStr) => new Date(dateStr as string).getTime())
    .filter((t: number) => !Number.isNaN(t));
  if (!timestamps.length) return null;
  return new Date(Math.min(...timestamps));
}

export function makeEmptyEvent(): EventDetail {
  return {
    id: Date.now().toString(),
    date: "",
    time: "",
    title: "",
    address: "",
  };
}

export function openNativePicker(e: React.MouseEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>) {
  const target = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
  if (typeof target.showPicker === "function") {
    target.showPicker();
  }
}