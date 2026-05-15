import type { BookingRow } from "../types";
import { formatRupiahAscii, parseEventDetails } from "../utils";
import type { ReceiptKind } from "../bookingReceipt/receiptTypes";
import { 
  u8, concat, initPrinter, align, bold, textSize, textLine, feed, partialCut, printBarcode128, printQRCode 
} from "./escposBytes";

export function buildEscPosReceiptPayload(row: BookingRow, type: ReceiptKind, customPaidValue?: number): Uint8Array {
  // --- PERHITUNGAN KEUANGAN ---
  const invoice = row.invoice || {};
  const total = Number(invoice.total_amount || 0);
  const dpSuggested = Number(invoice.dp_amount || total * 0.5);
  const paidCurrent = Number(invoice.paid_amount || 0);
  const dpRecorded = typeof row.dp_paid_amount === "number" ? row.dp_paid_amount : undefined;
  const paidForDpReceipt = Number(customPaidValue ?? dpRecorded ?? dpSuggested);
  const isLunas = type === "lunas";
  const dpPaidDisplay = typeof dpRecorded === "number" && !Number.isNaN(dpRecorded) ? dpRecorded : dpSuggested;
  const pelunasanAmount = Math.max(total - dpPaidDisplay, 0);

  const W = 32; // Lebar standard karakter font A
  const rule = "-".repeat(W);
  const parts: Uint8Array[] = [];

  parts.push(initPrinter());

  // --- HEADER (BESAR & TEBAL) ---
  parts.push(align(1)); // Rata Tengah
  parts.push(bold(true), textSize(true, true)); // Ukuran 2x Lipat
  parts.push(textLine("MAENG STUDIO"));
  
  parts.push(bold(false), textSize(false, false)); // Ukuran Normal
  parts.push(textLine("Jasa Dokumentasi & Audio"));
  parts.push(textLine("Jl. Kapten Robani Kadir No 06"));
  parts.push(textLine("Kec. Plaju, Kota Palembang"));
  parts.push(textLine("WA: 08117873878"));
  parts.push(textLine(rule));

  // --- JUDUL NOTA ---
  parts.push(bold(true));
  parts.push(textLine(isLunas ? "NOTA PELUNASAN" : "NOTA PEMBAYARAN DP"));
  parts.push(bold(false));
  parts.push(feed(1));

  // --- BARCODE NOMOR NOTA ---
  parts.push(printBarcode128(String(row.invoice_number || "INV-ERR")));
  parts.push(feed(1));
  parts.push(textLine(rule));

  // --- INFO KLIEN ---
  parts.push(align(0)); // Rata Kiri
  parts.push(textLine(`Tgl  : ${new Date().toLocaleDateString("id-ID")}`));
  parts.push(textLine(`Klien: ${String(row.client_name || "-")}`));
  parts.push(textLine(`Acara: ${String(row.event_type || "-")}`));
  parts.push(textLine(rule));

  // ============================================
  // LOGIKA BARU: MEMBEDAH PAKET SECARA MANUAL
  // ============================================
  parts.push(bold(true));
  parts.push(textLine("RINCIAN PAKET:"));
  parts.push(bold(false));

  // 1. Render Paket Utama
  const pkgName = String(row.package_name || "Paket Utama");
  const pkgType = String(row.package_type || "Jasa");
  const pkgPriceAmount = Number(row.package_price || 0);
  const pkgPriceFormatted = formatRupiahAscii(pkgPriceAmount);
  
  parts.push(textLine(`[${pkgType}] ${pkgName}`.slice(0, W)));
  parts.push(textLine(`${"".padStart(Math.max(0, W - pkgPriceFormatted.length), " ")}${pkgPriceFormatted}`));

  // 2. Render Layanan Tambahan (Addons)
  let addonTotal = 0;
  if (Array.isArray(row.addon_packages) && row.addon_packages.length > 0) {
    parts.push(feed(1));
    parts.push(bold(true));
    parts.push(textLine("LAYANAN TAMBAHAN:"));
    parts.push(bold(false));
    
    for (const addon of row.addon_packages) {
      const addonName = `+ ${addon.name}`.slice(0, W);
      const addonPriceAmount = Number(addon.price || 0);
      const addonPriceFormatted = formatRupiahAscii(addonPriceAmount);
      
      addonTotal += addonPriceAmount;
      
      parts.push(textLine(`${addonName}`));
      parts.push(textLine(`${"".padStart(Math.max(0, W - addonPriceFormatted.length), " ")}${addonPriceFormatted}`));
    }
  }

  // 3. Render Diskon / Biaya Lain-lain (Jika Ada Selisih)
  const calcTotal = pkgPriceAmount + addonTotal;
  const diff = total - calcTotal;
  
  if (diff > 0) {
      parts.push(feed(1));
      parts.push(textLine(`+ Biaya Lain/Penyesuaian`));
      const diffStr = formatRupiahAscii(diff);
      parts.push(textLine(`${"".padStart(Math.max(0, W - diffStr.length), " ")}${diffStr}`));
  } else if (diff < 0) {
      parts.push(feed(1));
      parts.push(textLine(`- Diskon/Potongan Harga`));
      const diffStr = formatRupiahAscii(Math.abs(diff));
      parts.push(textLine(`${"".padStart(Math.max(0, W - diffStr.length), " ")}${diffStr}`));
  }
  // ============================================

  parts.push(textLine(rule));

  // --- INFO TANGGAL ACARA ---
  parts.push(bold(true));
  parts.push(textLine("JADWAL ACARA:"));
  parts.push(bold(false));
  const events = parseEventDetails(row.event_details).slice(0, 3);
  if (!events.length) parts.push(textLine("-"));
  for (const ev of events) {
    const d = ev.date ? new Date(String(ev.date)).toLocaleDateString("id-ID") : "-";
    parts.push(textLine(`${String(ev.title || "Acara").slice(0, 20)} ${d}`));
  }
  parts.push(textLine(rule));

  // --- TOTALAN HARGA ---
  if (isLunas) {
    parts.push(textLine(`Total tagihan : ${formatRupiahAscii(total)}`));
    parts.push(textLine(`DP terbayar   : ${formatRupiahAscii(dpPaidDisplay)}`));
    parts.push(textLine(`Pelunasan     : ${formatRupiahAscii(pelunasanAmount)}`));
    parts.push(bold(true));
    parts.push(textLine(`Total dibayar : ${formatRupiahAscii(paidCurrent)}`));
    parts.push(bold(false));
  } else {
    parts.push(textLine(`Total tagihan : ${formatRupiahAscii(total)}`));
    parts.push(textLine(`Pembayaran DP : ${formatRupiahAscii(paidForDpReceipt)}`));
    parts.push(textLine(`Terbayar      : ${formatRupiahAscii(Math.max(paidCurrent, paidForDpReceipt))}`));
    parts.push(bold(true));
    parts.push(textLine(`Sisa Tagihan  : ${formatRupiahAscii(Math.max(total - paidForDpReceipt, 0))}`));
    parts.push(bold(false));
  }
  parts.push(textLine(rule));

  // --- FOOTER & QR CODE ---
  parts.push(align(1)); // Rata Tengah
  parts.push(textLine(isLunas ? "Tagihan LUNAS. Terima kasih!" : "Sisa wajib dilunasi H-1 Acara."));
  parts.push(textLine("Simpan struk ini sebagai bukti."));
  parts.push(feed(2));
  
  // Mencetak QR Code yang mengarah ke Website Anda
  parts.push(printQRCode("https://www.maengstudio.my.id", 6)); 
  parts.push(textLine("Scan QR untuk ke Galeri Website"));
  parts.push(bold(true));
  parts.push(textLine("www.maengstudio.my.id"));
  parts.push(bold(false));

  // --- AKHIRI CETAKAN ---
  parts.push(feed(4)); // Dorong kertas keluar agar mudah dirobek
  parts.push(partialCut()); // Potong kertas

  return concat(...parts);
}