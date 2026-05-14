import type { BookingRow } from "../types";
import type { PackageLineItem } from "./receiptTypes";

/** Susun baris paket utama + tambahan untuk struk (harga per baris, lalu total). */
export function buildPackageLineItems(
  row: BookingRow & { packages?: { name: string } }
): PackageLineItem[] {
  const invoice = row.invoice || {};
  const total = Number(invoice.total_amount || 0);
  
  // Mencoba menarik nama paket dari relasi 'packages.name' jika 'package_name' kosong/salah
  const dbPackageName = String(row.package_name || row.packages?.name || "Paket Utama");
  const typeLabel = row.package_type ? `[${row.package_type}] ` : "";
  const mainPriceFromDb = Number(row.package_price || 0);

  const addons = Array.isArray(row.addon_packages) ? row.addon_packages : [];
  const addonSum = addons.reduce((a, add) => a + Number(add.price || 0), 0);

  let mainAmount = mainPriceFromDb;
  if (mainAmount <= 0 && total > 0) {
    mainAmount = Math.max(total - addonSum, 0);
  }

  const lines: PackageLineItem[] = [];
  lines.push({
    label: `${typeLabel}${dbPackageName}`.trim(),
    amount: mainAmount,
  });

  for (const add of addons) {
    const t = add.type ? `[${add.type}] ` : "";
    lines.push({
      label: `${t}${add.name}`.trim(),
      amount: Number(add.price || 0),
    });
  }

  const sumLines = lines.reduce((a, b) => a + b.amount, 0);
  const delta = total - sumLines;
  
  if (lines.length === 0 && total > 0) {
    return [{ label: `${typeLabel}${dbPackageName}`.trim(), amount: total }];
  }
  
  // Jika total pembayaran dgn rincian paket selisih, tampilkan penyesuaian (teks diperpendek agar muat)
  if (Math.abs(delta) >= 1) {
    lines.push({
      label: delta > 0 ? "Tambahan/Penyesuaian" : "Diskon/Potongan Harga",
      amount: delta,
    });
  }

  return lines;
}