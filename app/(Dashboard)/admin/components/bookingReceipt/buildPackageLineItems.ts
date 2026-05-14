import type { BookingRow } from "../types";
import type { PackageLineItem } from "./receiptTypes";

/** Susun baris paket utama + tambahan untuk struk (harga per baris, lalu total). */
export function buildPackageLineItems(row: BookingRow): PackageLineItem[] {
  const invoice = row.invoice || {};
  const total = Number(invoice.total_amount || 0);
  const mainName = String(row.package_name || "Paket");
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
    label: `${typeLabel}${mainName}`.trim() || "Paket utama",
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
    return [{ label: `${typeLabel}${mainName}`.trim() || "Paket", amount: total }];
  }
  if (Math.abs(delta) >= 1) {
    lines.push({
      label: delta > 0 ? "[Tambahan] Layanan / penyesuaian" : "[Diskon / penyesuaian]",
      amount: delta,
    });
  }

  return lines;
}
