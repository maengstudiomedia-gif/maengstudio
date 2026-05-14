import type { BookingRow } from "../types";
import { buildThermalReceiptHtml } from "./buildThermalReceiptHtml";
import type { ReceiptKind } from "./receiptTypes";

export function openBrowserPrintReceipt(
  row: BookingRow,
  type: ReceiptKind,
  customPaidValue?: number
): { ok: true } | { ok: false; reason: string } {
  const receiptWindow = window.open("", "_blank", "width=420,height=760");
  if (!receiptWindow) {
    return { ok: false, reason: "Popup diblokir browser. Izinkan popup untuk mencetak nota." };
  }
  receiptWindow.document.open();
  receiptWindow.document.write(buildThermalReceiptHtml(row, type, customPaidValue));
  receiptWindow.document.close();
  receiptWindow.focus();
  setTimeout(() => {
    receiptWindow.print();
  }, 250);
  return { ok: true };
}
