import type { BookingRow } from "../types";
import { formatRupiah, parseEventDetails } from "../utils";
import { buildPackageLineItems } from "../bookingReceipt/buildPackageLineItems";
import type { ReceiptKind } from "../bookingReceipt/receiptTypes";
import { buildEscPosBytes } from "./escposBytes";

/** Susun teks struk 80mm (lebar ~32 karakter Font A) untuk dikirim ke printer ESC/POS. */
export function buildThermalReceiptTextLines(row: BookingRow, type: ReceiptKind, customPaidValue?: number): string[] {
  const invoice = row.invoice || {};
  const total = Number(invoice.total_amount || 0);
  const dpSuggested = Number(invoice.dp_amount || total * 0.5);
  const paidCurrent = Number(invoice.paid_amount || 0);
  const dpRecorded = typeof row.dp_paid_amount === "number" ? row.dp_paid_amount : undefined;
  const paidForDpReceipt = Number(customPaidValue ?? dpRecorded ?? dpSuggested);
  const isLunas = type === "lunas";
  const dpPaidDisplay = typeof dpRecorded === "number" && !Number.isNaN(dpRecorded) ? dpRecorded : dpSuggested;
  const pelunasanAmount = Math.max(total - dpPaidDisplay, 0);

  const lines: string[] = [];
  const W = 32;
  const rule = "-".repeat(W);

  lines.push("      MAENG STUDIO");
  lines.push("   Jasa Audio & Dokumentasi");
  lines.push("");
  lines.push(rule);
  lines.push(isLunas ? "      NOTA PELUNASAN" : "    NOTA PEMBAYARAN DP");
  lines.push(String(row.invoice_number || "-"));
  lines.push(rule);
  lines.push(`Tgl: ${new Date().toLocaleDateString("id-ID")}`);
  lines.push(`Klien: ${String(row.client_name || "-")}`);
  lines.push(`Acara: ${String(row.event_type || "-")}`);
  lines.push(rule);
  lines.push("RINCIAN PAKET:");
  for (const item of buildPackageLineItems(row)) {
    const left = item.label.slice(0, 22);
    const right = formatRupiah(item.amount);
    lines.push(`${left}`);
    lines.push(`${"".padStart(Math.max(0, W - right.length), " ")}${right}`);
  }
  lines.push(rule);
  lines.push("JADWAL:");
  const events = parseEventDetails(row.event_details).slice(0, 3);
  if (!events.length) lines.push("-");
  for (const ev of events) {
    const d = ev.date ? new Date(String(ev.date)).toLocaleDateString("id-ID") : "-";
    lines.push(`${String(ev.title || "Acara").slice(0, 20)} ${d}`);
  }
  lines.push(rule);
  if (isLunas) {
    lines.push(`Total tagihan : ${formatRupiah(total)}`);
    lines.push(`DP terbayar     : ${formatRupiah(dpPaidDisplay)}`);
    lines.push(`Pelunasan       : ${formatRupiah(pelunasanAmount)}`);
    lines.push(`Total terbayar  : ${formatRupiah(paidCurrent)}`);
  } else {
    lines.push(`Total tagihan   : ${formatRupiah(total)}`);
    lines.push(`Pembayaran DP   : ${formatRupiah(paidForDpReceipt)}`);
    lines.push(`Terbayar (kum.) : ${formatRupiah(Math.max(paidCurrent, paidForDpReceipt))}`);
    lines.push(`Sisa            : ${formatRupiah(Math.max(total - paidForDpReceipt, 0))}`);
  }
  lines.push(rule);
  lines.push(isLunas ? "Tagihan lunas. Terima kasih." : "Sisa wajib lunas H-1 acara.");
  lines.push("Simpan sebagai bukti.");
  lines.push("");
  return lines;
}

export function buildEscPosReceiptPayload(row: BookingRow, type: ReceiptKind, customPaidValue?: number) {
  const textLines = buildThermalReceiptTextLines(row, type, customPaidValue);
  return buildEscPosBytes(textLines);
}
