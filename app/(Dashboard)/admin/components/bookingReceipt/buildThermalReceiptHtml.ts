import type { BookingRow } from "../types";
import { escapeHtml, formatRupiah, parseEventDetails } from "../utils";
import { buildPackageLineItems } from "./buildPackageLineItems";
import type { ReceiptKind } from "./receiptTypes";

export function buildThermalReceiptHtml(
  row: BookingRow,
  type: ReceiptKind,
  customPaidValue?: number
) {
  const invoice = row.invoice || {};
  const total = Number(invoice.total_amount || 0);
  const dpSuggested = Number(invoice.dp_amount || total * 0.5);
  const paidCurrent = Number(invoice.paid_amount || 0);
  const dpRecorded = typeof row.dp_paid_amount === "number" ? row.dp_paid_amount : undefined;

  const paidForDpReceipt = Number(customPaidValue ?? dpRecorded ?? dpSuggested);
  const isLunas = type === "lunas";
  const dpPaidDisplay = typeof dpRecorded === "number" && !Number.isNaN(dpRecorded) ? dpRecorded : dpSuggested;
  const pelunasanAmount = Math.max(total - dpPaidDisplay, 0);

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

  const pkgLines = buildPackageLineItems(row)
    .map(
      (line) =>
        `<div class="row"><span>${escapeHtml(line.label)}</span><span>${escapeHtml(formatRupiah(line.amount))}</span></div>`
    )
    .join("");

  const noteType = isLunas ? "NOTA PELUNASAN" : "NOTA PEMBAYARAN DP";
  const infoBottom = isLunas
    ? "Tagihan telah lunas. Terima kasih."
    : "Sisa pembayaran wajib lunas maksimal H-1 acara.";

  const paymentBlock = isLunas
    ? `
    <div class="row"><span>Total tagihan</span><span>${escapeHtml(formatRupiah(total))}</span></div>
    <div class="row"><span>DP terbayar</span><span>${escapeHtml(formatRupiah(dpPaidDisplay))}</span></div>
    <div class="row bold"><span>Pelunasan</span><span>${escapeHtml(formatRupiah(pelunasanAmount))}</span></div>
    <div class="row"><span>Total terbayar</span><span>${escapeHtml(formatRupiah(paidCurrent))}</span></div>
    `
    : `
    <div class="row"><span>Total tagihan</span><span>${escapeHtml(formatRupiah(total))}</span></div>
    <div class="row bold"><span>Pembayaran DP</span><span>${escapeHtml(formatRupiah(paidForDpReceipt))}</span></div>
    <div class="row"><span>Sudah terbayar (kumulatif)</span><span>${escapeHtml(formatRupiah(Math.max(paidCurrent, paidForDpReceipt)))}</span></div>
    <div class="row bold"><span>Sisa</span><span>${escapeHtml(formatRupiah(Math.max(total - paidForDpReceipt, 0)))}</span></div>
    `;

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

    <div class="small bold">Rincian paket:</div>
    ${pkgLines}
    <div class="line"></div>

    <div class="small bold">Detail jadwal:</div>
    <div class="small">${eventLines || "<div>-</div>"}</div>
    <div class="line"></div>

    ${paymentBlock}
    <div class="line"></div>

    <div class="small center">${escapeHtml(infoBottom)}</div>
    <div class="small center">Simpan nota ini sebagai bukti transaksi.</div>
  </div>
</body>
</html>`;
}
