import type { BookingRow } from "../types";
import { escapeHtml, parseEventDetails } from "../utils";
import { buildPackageLineItems } from "./buildPackageLineItems";
import type { ReceiptKind } from "./receiptTypes";

// Helper BARU yang 100% aman dari karakter aneh (non-breaking space)
const safeFormatRupiah = (val: number) => {
  // Format manual murni: 1500000 -> "Rp 1.500.000"
  return "Rp " + Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export function buildThermalReceiptHtml(
  row: BookingRow & { dp_amount?: number }, // Antisipasi jika ada field dp_amount
  type: ReceiptKind,
  customPaidValue?: number
) {
  const invoice = row.invoice || {};
  const total = Number(invoice.total_amount || 0);
  
  // Ambil uang yang sudah dibayar dari invoice.paid_amount ATAU row.dp_amount
  const paidCurrent = Number(invoice.paid_amount || row.dp_amount || 0);

  const paidForReceipt = customPaidValue !== undefined ? Number(customPaidValue) : paidCurrent;

  const isLunas = type === "lunas";
  const pelunasanAmount = Math.max(total - paidCurrent, 0);

  const now = new Date();
  const events = parseEventDetails(row.event_details);
  const eventLines = events
    .slice(0, 3)
    .map((event, index) => {
      const date = event?.date ? new Date(String(event.date)).toLocaleDateString("id-ID") : "-";
      const title = String(event?.title || `Acara ${index + 1}`);
      const time = String(event?.time || "");
      return `<div>${escapeHtml(title)} <br/> ${escapeHtml(date)} ${escapeHtml(time)}</div>`;
    })
    .join("<br/>");

  const pkgLines = buildPackageLineItems(row)
    .map(
      (line) =>
        `<div class="pkg-row">
           <div class="pkg-name">${escapeHtml(line.label)}</div>
           <div class="pkg-price">${escapeHtml(safeFormatRupiah(line.amount))}</div>
         </div>`
    )
    .join("");

  const noteType = isLunas ? "NOTA PELUNASAN" : "NOTA PEMBAYARAN DP";
  const infoBottom = isLunas
    ? "Tagihan telah lunas. Terima kasih."
    : "Sisa wajib lunas H-1 acara.";

  const paymentBlock = isLunas
    ? `
    <div class="total-row"><span>Total Tagihan</span><span>: ${escapeHtml(safeFormatRupiah(total))}</span></div>
    <div class="total-row"><span>Sdh Terbayar</span><span>: ${escapeHtml(safeFormatRupiah(paidCurrent))}</span></div>
    <div class="total-row bold"><span>Pelunasan</span><span>: ${escapeHtml(safeFormatRupiah(pelunasanAmount))}</span></div>
    `
    : `
    <div class="total-row"><span>Total Tagihan</span><span>: ${escapeHtml(safeFormatRupiah(total))}</span></div>
    <div class="total-row"><span>Terbayar (DP)</span><span>: ${escapeHtml(safeFormatRupiah(paidForReceipt))}</span></div>
    <div class="total-row bold"><span>Sisa Tagihan</span><span>: ${escapeHtml(safeFormatRupiah(Math.max(total - paidForReceipt, 0)))}</span></div>
    `;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${noteType}</title>
  <style>
    @page { size: 58mm auto; margin: 0; }
    body { margin: 0; padding: 0; font-family: monospace; background: #fff; color: #000; }
    .receipt { width: 100%; max-width: 58mm; padding: 2mm 4mm; box-sizing: border-box; margin: 0 auto; }
    .center { text-align: center; }
    .title { font-weight: bold; font-size: 14px; margin-bottom: 2px; }
    .small { font-size: 11px; margin-bottom: 2px; line-height: 1.3; }
    .line { border-top: 1px dashed #000; margin: 6px 0; }
    
    /* Layout Rincian Paket - Diubah agar tidak terpotong! */
    .pkg-row { margin: 6px 0; font-size: 11px; display: flex; flex-direction: column; }
    .pkg-name { width: 100%; text-align: left; white-space: pre-wrap; word-wrap: break-word; margin-bottom: 2px; }
    .pkg-price { width: 100%; text-align: right; font-weight: bold; }
    
    /* Layout Total */
    .total-row { display: flex; justify-content: space-between; font-size: 11px; margin: 4px 0; }
    .total-row span:first-child { width: auto; flex-shrink: 0; text-align: left; }
    .total-row span:last-child { flex: 1; text-align: right; white-space: nowrap; }
    
    .bold { font-weight: bold; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center">
      <div class="title">MAENG STUDIO</div>
      <div class="small">Jasa Audio & Dokumentasi</div>
    </div>
    <div class="line"></div>
    <div class="center bold small">${noteType}</div>
    <div class="small center" style="font-size:9px;">${escapeHtml(String(row.invoice_number || "-"))}</div>
    <div class="line"></div>

    <div class="small">Tgl  : ${escapeHtml(now.toLocaleDateString("id-ID"))}</div>
    <div class="small">Klien: ${escapeHtml(String(row.client_name || "-"))}</div>
    <div class="small">Acara: ${escapeHtml(String(row.event_type || "-"))}</div>
    <div class="line"></div>

    <div class="small bold">RINCIAN PAKET:</div>
    ${pkgLines}
    <div class="line"></div>

    <div class="small bold">JADWAL:</div>
    <div class="small">${eventLines || "<div>-</div>"}</div>
    <div class="line"></div>

    ${paymentBlock}
    <div class="line"></div>

    <div class="small center">${escapeHtml(infoBottom)}</div>
    <div class="small center" style="margin-top:4px;">Simpan sebagai bukti.</div>
  </div>
</body>
</html>`;
}