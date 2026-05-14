import { Pencil, Trash2, Printer, CheckCircle2, Upload, Factory } from "lucide-react";
import { formatRupiah, parseEventDetails } from "./utils";
import type { BookingRow } from "./types";

type BookingTableProps = {
  bookings: BookingRow[];
  onEdit: (row: BookingRow) => void;
  onDelete: (id: string) => void;
  onPayDp: (row: BookingRow) => void;
  onPayLunas: (row: BookingRow) => void;
  onStartEdit: (id: string) => void;
  /** Memindahkan proyek ke tahap percetakan (bukan cetak struk 80mm). */
  onEnterPrintStage: (id: string) => void;
  /** Modal cetak Bluetooth 80mm */
  onOpenThermalPrint: (row: BookingRow) => void;
  onFinish: (id: string) => void;
  onMarkPickedUp: (row: BookingRow) => void;
};

export default function BookingTable({
  bookings,
  onEdit,
  onDelete,
  onPayDp,
  onPayLunas,
  onStartEdit,
  onEnterPrintStage,
  onOpenThermalPrint,
  onFinish,
  onMarkPickedUp,
}: BookingTableProps) {
  if (bookings.length === 0) {
    return <div className="py-16 text-center text-white/40">Belum ada data pesanan.</div>;
  }

  return (
    <table className="w-full min-w-[1720px] text-sm">
      <thead className="text-left text-white/60 border-b border-white/10">
        <tr>
          <th className="px-4 py-3">Nota</th>
          <th className="px-4 py-3">Klien</th>
          <th className="px-4 py-3">Paket</th>
          <th className="px-4 py-3">Acara</th>
          <th className="px-4 py-3">Tanggal Acara</th>
          <th className="px-4 py-3">Total Harga</th>
          <th className="px-4 py-3">Terbayar</th>
          <th className="px-4 py-3">Sisa</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Aksi Edit/Hapus</th>
          <th className="px-4 py-3">Aksi Pembayaran</th>
          <th className="px-4 py-3">Aksi Proses</th>
          <th className="px-4 py-3">Cetak 80mm</th>
        </tr>
      </thead>
      <tbody>
        {bookings.map((row) => {
          const invoice = row.invoice || {};
          const total = Number(invoice.total_amount || 0);

          const paid = Number(invoice.paid_amount || 0);
          const remaining = Math.max(total - paid, 0);

          const events = parseEventDetails(row.event_details);
          const stage = row.process?.stage || "awaiting_settlement";
          const isFullyPaid = String(invoice.payment_status || "") === "paid";

          const canStartEdit = isFullyPaid && stage === "awaiting_settlement";
          const canEnterPrintStage = isFullyPaid && stage === "edit_process";
          const canFinish = isFullyPaid && stage === "print_process";
          const canMarkPicked = isFullyPaid && stage === "completed";

          return (
            <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02]">
              <td className="px-4 py-3 font-mono text-amber-400">{row.invoice_number || "-"}</td>
              <td className="px-4 py-3">
                <p className="font-medium text-white">{row.client_name || "-"}</p>
                <p className="text-xs text-white/50">{row.client_phone || "-"}</p>
              </td>
              <td className="px-4 py-3">
                <p className="text-white">{row.package_name || "-"}</p>
                <p className="text-xs text-white/40">{row.package_type || "-"}</p>
                {Array.isArray(row.addon_packages) && row.addon_packages.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {row.addon_packages.map((a) => (
                      <p key={a.id} className="text-[11px] text-sky-300/90">
                        + {a.name}{" "}
                        <span className="text-white/40">({formatRupiah(Number(a.price || 0))})</span>
                      </p>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-white/80">{row.event_type || "-"}</td>

              <td className="px-4 py-3 text-white/80">
                {events.length > 0 ? (
                  <div className="space-y-1">
                    {events.map((ev, idx) => (
                      <div key={idx} className="text-xs whitespace-nowrap">
                        {ev.date ? new Date(ev.date).toLocaleDateString("id-ID") : "-"}
                      </div>
                    ))}
                  </div>
                ) : (
                  "-"
                )}
              </td>

              <td className="px-4 py-3 text-white/80">{formatRupiah(total)}</td>
              <td className="px-4 py-3 text-white/80">{formatRupiah(paid)}</td>
              <td className="px-4 py-3 text-amber-400 font-medium">{formatRupiah(remaining)}</td>

              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold border ${
                    row.status === "completed"
                      ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                      : row.status === "locked"
                        ? "text-blue-400 border-blue-500/20 bg-blue-500/10"
                        : "text-amber-400 border-amber-500/20 bg-amber-500/10"
                  }`}
                >
                  {row.status || "-"}
                </span>
              </td>

              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(row)}
                    className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(row.id)}
                    className="px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>

              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => onPayDp(row)}
                    className="px-2 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold"
                  >
                    BAYAR DP
                  </button>
                  <button
                    onClick={() => onPayLunas(row)}
                    className="px-2 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold"
                  >
                    PELUNASAN
                  </button>
                </div>
              </td>

              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onStartEdit(row.id)}
                    disabled={!canStartEdit}
                    title="Mulai proses edit"
                    className={`p-2 rounded-lg ${canStartEdit ? "bg-white/5 hover:bg-white/10 text-white" : "text-white/10 cursor-not-allowed"}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEnterPrintStage(row.id)}
                    disabled={!canEnterPrintStage}
                    title="Masuk tahap percetakan (hasil ke klien)"
                    className={`p-2 rounded-lg ${canEnterPrintStage ? "bg-violet-500/10 hover:bg-violet-500/20 text-violet-300" : "text-violet-900/40 cursor-not-allowed"}`}
                  >
                    <Factory className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onFinish(row.id)}
                    disabled={!canFinish}
                    title="Selesaikan percetakan"
                    className={`p-2 rounded-lg ${canFinish ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300" : "text-emerald-900/40 cursor-not-allowed"}`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onMarkPickedUp(row)}
                    disabled={!canMarkPicked}
                    title="Tandai diambil"
                    className={`p-2 rounded-lg ${canMarkPicked ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300" : "text-amber-900/40 cursor-not-allowed"}`}
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
              </td>

              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onOpenThermalPrint(row)}
                  title="Cetak struk ke printer thermal Bluetooth 80mm"
                  className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 text-[10px] font-bold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Bluetooth
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
