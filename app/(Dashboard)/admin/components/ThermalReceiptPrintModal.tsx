"use client";

import { useState } from "react";
import { Loader2, Printer, X } from "lucide-react";
import type { BookingRow } from "./types";
import { openBrowserPrintReceipt } from "./bookingReceipt/openBrowserPrintReceipt";
import type { ReceiptKind } from "./bookingReceipt/receiptTypes";
import { buildEscPosReceiptPayload } from "./thermalBluetooth/buildThermalReceiptEscPos";
import { sendBytesToBleThermalPrinter } from "./thermalBluetooth/sendBytesToBleThermalPrinter";

type Props = {
  row: BookingRow;
  onClose: () => void;
  onNotify: (message: string, type: "success" | "error" | "info") => void;
};

export default function ThermalReceiptPrintModal({ row, onClose, onNotify }: Props) {
  const [kind, setKind] = useState<ReceiptKind>("dp");
  const [busy, setBusy] = useState(false);

  const invoice = row.invoice || {};
  const paid = Number(invoice.paid_amount || 0);
  const isPaid = String(invoice.payment_status || "") === "paid";
  const canDp = paid > 0;
  const canLunas = isPaid;

  async function handleBlePrint() {
    if (kind === "dp" && !canDp) {
      onNotify("Belum ada pembayaran DP untuk dicetak.", "error");
      return;
    }
    if (kind === "lunas" && !canLunas) {
      onNotify("Struk pelunasan hanya setelah lunas.", "error");
      return;
    }
    setBusy(true);
    try {
      const payload = buildEscPosReceiptPayload(row, kind);
      await sendBytesToBleThermalPrinter(payload);
      onNotify("Terkirim ke printer Bluetooth.", "success");
    } catch (e) {
      onNotify(e instanceof Error ? e.message : "Gagal mencetak ke Bluetooth.", "error");
    } finally {
      setBusy(false);
    }
  }

  function handleBrowserFallback() {
    const r = openBrowserPrintReceipt(row, kind);
    if (!r.ok) onNotify(r.reason, "error");
  }

  return (
    <div className="fixed inset-0 z-[999998] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Cetak 80mm (Bluetooth)</h3>
            <p className="text-xs text-white/50 mt-1 font-mono">{row.invoice_number}</p>
            <p className="text-sm text-white/70 mt-2">{row.client_name}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white" aria-label="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-amber-200/80 leading-relaxed">
          Pilih jenis struk, lalu hubungkan printer thermal BLE 80mm (ESC/POS). Pastikan situs diakses lewat HTTPS. Printer
          harus mendukung BLE; printer Bluetooth Classic saja tidak bisa dari browser.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canDp}
            onClick={() => setKind("dp")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              kind === "dp" ? "bg-amber-500 text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
            } ${!canDp ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            Cetak DP
          </button>
          <button
            type="button"
            disabled={!canLunas}
            onClick={() => setKind("lunas")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              kind === "lunas" ? "bg-emerald-500 text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
            } ${!canLunas ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            Struk pelunasan
          </button>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={handleBlePrint}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
          Hubungkan & cetak Bluetooth
        </button>

        <button type="button" onClick={handleBrowserFallback} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-white/80">
          Cadangan: cetak lewat dialog browser
        </button>
      </div>
    </div>
  );
}
