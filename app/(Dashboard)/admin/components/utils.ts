// app/(Dashboard)/admin/components/utils.ts

import { BookingRow, EventDetail } from "./types";

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

export function buildThermalReceiptHtml(row: BookingRow, type: "dp" | "lunas", customPaidValue?: number) {
  const invoice = row.invoice || {};
  const total = Number(invoice.total_amount || 0);
  const dp = Number(invoice.dp_amount || total * 0.5);
  const paidCurrent = Number(invoice.paid_amount || 0);
  const paidValue = type === "dp" ? Number(customPaidValue || dp) : total;
  const remaining = Math.max(total - paidValue, 0);
  const now = new Date();
  
  const events = parseEventDetails(row.event_details);
  const eventLines = events
    .slice(0, 3)
    .map((event, index) => {
      const date = event?.date ? new Date(String(event.date)).toLocaleDateString("id-ID") : "-";
      const title = String(event?.title || `Acara ${index + 1}`);
      const time = String(event?.time || "-");
      return `<div>${escapeHtml(title)} | ${escapeHtml(date)} ${escapeHtml(time)}</div>`;
    })
    .join("");

  // --- LOGIKA ITEM TRANSAKSI & TAMBAHAN ---
  // 1. Ambil harga asli paket dari database
  const basePkgPrice = Number(row.package_price || 0);
  
  // 2. Cegah error jika harga base = 0, kita pakai harga total agar tidak minus
  const mainPrice = (basePkgPrice > 0 && basePkgPrice <= total) ? basePkgPrice : total;
  
  // 3. Selisih tagihan dianggap sebagai Biaya Tambahan (Layanan Ekstra / Custom)
  const extraPrice = total - mainPrice;

  const typeLabel = row.package_type ? `[${row.package_type}] ` : "";
  const pkgName = String(row.package_name || "Paket Custom");

  // Cetak Paket Utama dengan harga aslinya
  let itemLines = `<div class="row"><span>${escapeHtml(typeLabel + pkgName)}</span><span>${escapeHtml(formatRupiah(mainPrice))}</span></div>`;

  // Jika ada selisih biaya, cetak sebagai baris item tambahan
  if (extraPrice > 0) {
    itemLines += `<div class="row"><span>[Tambahan] Ekstra Layanan / Custom</span><span>${escapeHtml(formatRupiah(extraPrice))}</span></div>`;
  }

  const noteType = type === "dp" ? "NOTA PEMBAYARAN DP" : "NOTA PELUNASAN";
  const paymentLabel = type === "dp" ? "Pembayaran DP" : "Pembayaran Lunas";
  const infoBottom =
    type === "dp"
      ? "Sisa pembayaran wajib lunas maksimal H-1 acara."
      : "Tagihan telah lunas. Terima kasih.";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${noteType}</title>
  <style>
    @page { size: 88mm auto; margin: 0; }
    body { margin: 0; padding: 0; font-family: monospace; background: #fff; color: #000; }
    .receipt { width: 88mm; padding: 4mm; box-sizing: border-box; }
    .center { text-align: center; }
    .title { font-weight: bold; font-size: 13px; }
    .small { font-size: 10px; }
    .line { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; gap: 10px; font-size: 11px; margin: 2px 0; }
    .muted { font-size: 10px; }
    .bold { font-weight: bold; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center">
      <div class="title">MAENG STUDIO</div>
      <div class="small">Jasa Audio & Dokumentasi</div>
      <div class="small">WhatsApp: ${escapeHtml(String(row.client_phone || "-"))}</div>
    </div>
    <div class="line"></div>
    <div class="center bold">${noteType}</div>
    <div class="small center">${escapeHtml(String(row.invoice_number || "-"))}</div>
    <div class="line"></div>

    <div class="row"><span>Tanggal</span><span>${escapeHtml(now.toLocaleDateString("id-ID"))}</span></div>
    <div class="row"><span>Klien</span><span>${escapeHtml(String(row.client_name || "-"))}</span></div>
    <div class="row"><span>Acara</span><span>${escapeHtml(String(row.event_type || "-"))}</span></div>
    <div class="line"></div>
    
    <div class="small bold">Item Transaksi:</div>
    ${itemLines}
    <div class="line"></div>

    <div class="small bold">Detail Jadwal:</div>
    <div class="small">${eventLines || "<div>-</div>"}</div>
    <div class="line"></div>

    <div class="row"><span>Total</span><span>${escapeHtml(formatRupiah(total))}</span></div>
    <div class="row"><span>${paymentLabel}</span><span>${escapeHtml(formatRupiah(paidValue))}</span></div>
    <div class="row"><span>Sudah Dibayar</span><span>${escapeHtml(formatRupiah(Math.max(paidCurrent, paidValue)))}</span></div>
    <div class="row bold"><span>Sisa</span><span>${escapeHtml(formatRupiah(remaining))}</span></div>
    <div class="line"></div>

    <div class="small center">${escapeHtml(infoBottom)}</div>
    <div class="small center">Simpan nota ini sebagai bukti transaksi.</div>
  </div>
</body>
</html>`;
}