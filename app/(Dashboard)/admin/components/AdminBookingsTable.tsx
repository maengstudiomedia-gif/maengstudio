"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, CheckCircle2, AlertTriangle, Info, HelpCircle } from "lucide-react";

// Impor action server Anda
import { 
  getAdminBookingsAction, 
  deleteAdminBookingAction, 
  updateAdminBookingAction, 
  updateBookingPaymentAction, 
  updateBookingProcessAction, 
  uploadPickupProofAction 
} from "@/app/actions/adminBookings";

// Impor komponen yang sudah dipecah
import BookingTable from "./BookingTable";
import EditBookingModal from "./EditBookingModal";
import PaymentModal from "./PaymentModal";
import ProcessPickupModal from "./ProcessPickupModal";
import ThermalReceiptPrintModal from "./ThermalReceiptPrintModal";

import { formatRupiah } from "./utils";
import type { BookingRow } from "./types";

export default function AdminBookingsTable() {
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [keyword, setKeyword] = useState("");
  
  // State untuk mengontrol Modal Form yang sedang terbuka
  const [editing, setEditing] = useState<BookingRow | null>(null);
  const [pickupTarget, setPickupTarget] = useState<BookingRow | null>(null);
  const [dpPaymentTarget, setDpPaymentTarget] = useState<{ row: BookingRow; defaultAmount: string } | null>(null);
  const [thermalPrintRow, setThermalPrintRow] = useState<BookingRow | null>(null);

  // --- STATE UNTUK MODAL NOTIFIKASI & KONFIRMASI PROFESIONAL ---
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; type: "success" | "error" | "info" }>({ isOpen: false, message: "", type: "info" });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; message: string; onConfirm: () => void }>({ isOpen: false, message: "", onConfirm: () => {} });

  const showAlert = (message: string, type: "success" | "error" | "info" = "info") => {
    setAlertModal({ isOpen: true, message, type });
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, message, onConfirm });
  };

  useEffect(() => { 
    fetchBookings(); 
  }, []);

  async function fetchBookings() {
    setIsLoading(true);
    const result = await getAdminBookingsAction();
    if (result.success) {
      setBookings((result.data || []) as BookingRow[]);
    } else {
      showAlert("Gagal memuat data pesanan: " + result.error, "error");
    }
    setIsLoading(false);
  }

  const filteredBookings = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((row) => {
      const invoice = String(row.invoice_number || "").toLowerCase();
      const client = String(row.client_name || "").toLowerCase();
      const phone = String(row.client_phone || "").toLowerCase();
      const pkg = String(row.package_name || "").toLowerCase();
      const addonHit = (row.addon_packages || []).some((a) => String(a.name || "").toLowerCase().includes(q));
      return invoice.includes(q) || client.includes(q) || phone.includes(q) || pkg.includes(q) || addonHit;
    });
  }, [bookings, keyword]);

  // Handler Hapus menggunakan Modal Konfirmasi
  function handleDelete(id: string) {
    showConfirm("Apakah Anda yakin ingin menghapus pesanan ini secara permanen?", async () => {
      const result = await deleteAdminBookingAction(id);
      if (result.success) {
        showAlert("Pesanan berhasil dihapus.", "success");
        fetchBookings();
      } else {
        showAlert("Gagal menghapus: " + result.error, "error");
      }
    });
  }

  // Render Utama
  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 md:p-6">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-3" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari nomor nota / klien / paket..."
            className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Konten Tabel Utama */}
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-x-auto">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : (
          <BookingTable
            bookings={filteredBookings}
            onEdit={(row) => setEditing({ ...row })}
            onDelete={handleDelete}
            onPayDp={(row) => {
              const invoice = row.invoice || {};
              const savedDp = Number(invoice.dp_amount || 0);
              setDpPaymentTarget({ 
                row, 
                defaultAmount: savedDp > 0 ? String(savedDp) : "" 
              });
            }}
            
            // PERBAIKAN PELUNASAN: Menggunakan custom modal confirm
            onPayLunas={(row) => {
              const total = Number(row.invoice?.total_amount || 0);
              const paid = Number(row.invoice?.paid_amount || 0);
              const sisaTagihan = Math.max(total - paid, 0);

              showConfirm(
                `Sisa Tagihan: ${formatRupiah(sisaTagihan)}\n\nApakah benar klien membayar sebesar ${formatRupiah(sisaTagihan)} untuk pelunasan?`,
                async () => {
                  const res = await updateBookingPaymentAction(row.id, "lunas");
                  if (res.success) {
                    showAlert("Pembayaran Berhasil Dilunasi!", "success");
                    fetchBookings();
                  } else {
                    showAlert("Gagal pelunasan: " + res.error, "error");
                  }
                }
              );
            }}

            onStartEdit={async (id) => {
              const res = await updateBookingProcessAction(id, "start_edit");
              if (res.success) fetchBookings();
              else showAlert("Gagal update proses: " + res.error, "error");
            }}
            onEnterPrintStage={async (id) => {
              const res = await updateBookingProcessAction(id, "start_print");
              if (res.success) fetchBookings();
              else showAlert("Gagal memasuki tahap percetakan: " + res.error, "error");
            }}
            onOpenThermalPrint={(row) => setThermalPrintRow({ ...row })}
            onFinish={async (id) => {
              const res = await updateBookingProcessAction(id, "finish");
              if (res.success) fetchBookings();
              else showAlert("Gagal update proses: " + res.error, "error");
            }}
            onMarkPickedUp={(row) => setPickupTarget(row)}
          />
        )}
      </div>

      {/* Render Modals Forms */}
      {editing && (
        <EditBookingModal
          initialData={editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
             // Menerjemahkan data secara aman agar lulus pengecekan TypeScript Netlify
             const payload = {
                id: data.id,
                client_name: data.client_name,
                client_phone: data.client_phone,
                event_type: data.event_type,
                custom_event_type: data.custom_event_type,
                booker_type: data.booker_type,
                bride_name: data.bride_name,
                groom_name: data.groom_name,
                // Konversi string JSON menjadi array, bypass error Strict Type dari TS
                event_details: (Array.isArray(data.event_details) 
                  ? data.event_details 
                  : typeof data.event_details === "string" 
                    ? JSON.parse(data.event_details) 
                    : []) as any[]
              };
  
              const res = await updateAdminBookingAction(payload as any);
            
            if (res.success) {
              setEditing(null);
              fetchBookings();
              showAlert("Data pesanan berhasil diedit!", "success");
            } else {
              showAlert("Gagal menyimpan edit: " + res.error, "error");
            }
          }}
        />
      )}

      {dpPaymentTarget && (
        <PaymentModal
          target={dpPaymentTarget.row}
          defaultAmount={dpPaymentTarget.defaultAmount}
          onClose={() => setDpPaymentTarget(null)}
          onSave={async (amount) => {
            const res = await updateBookingPaymentAction(dpPaymentTarget.row.id, "dp", amount);
            if (res.success) {
               setDpPaymentTarget(null);
               fetchBookings();
               showAlert("Pembayaran DP berhasil disimpan! Gunakan kolom Cetak 80mm untuk struk.", "success");
            } else {
               showAlert("Gagal update pembayaran: " + res.error, "error");
            }
          }}
        />
      )}

      {thermalPrintRow && (
        <ThermalReceiptPrintModal
          row={thermalPrintRow}
          onClose={() => setThermalPrintRow(null)}
          onNotify={(message, type) => showAlert(message, type)}
        />
      )}

      {pickupTarget && (
        <ProcessPickupModal
          target={pickupTarget}
          onClose={() => setPickupTarget(null)}
          onSave={async (file) => {
            const fd = new FormData();
            fd.append("bookingId", pickupTarget.id);
            fd.append("file", file);
            
            const upload = await uploadPickupProofAction(fd);
            if (!upload.success || !upload.url) {
              showAlert("Gagal upload bukti: " + upload.error, "error");
              return;
            }
            
            const res = await updateBookingProcessAction(pickupTarget.id, "picked_up", upload.url);
            if (res.success) {
              setPickupTarget(null);
              fetchBookings();
              showAlert("Status berhasil ditandai sudah diambil!", "success");
            } else {
              showAlert("Gagal update status diambil: " + res.error, "error");
            }
          }}
        />
      )}

      {/* --- KOMPONEN UI MODAL ALERT --- */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-6 space-y-4 text-center shadow-2xl animate-in zoom-in duration-200">
            <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ${
              alertModal.type === "success" ? "bg-emerald-500/20 text-emerald-400" :
              alertModal.type === "error" ? "bg-red-500/20 text-red-400" :
              "bg-blue-500/20 text-blue-400"
            }`}>
              {alertModal.type === "success" && <CheckCircle2 className="w-7 h-7" />}
              {alertModal.type === "error" && <AlertTriangle className="w-7 h-7" />}
              {alertModal.type === "info" && <Info className="w-7 h-7" />}
            </div>
            <h3 className="text-xl font-bold text-white">
              {alertModal.type === "success" ? "Berhasil!" : alertModal.type === "error" ? "Terjadi Kesalahan" : "Informasi"}
            </h3>
            <p className="text-sm text-white/70 whitespace-pre-line">{alertModal.message}</p>
            <button
              onClick={() => setAlertModal({ ...alertModal, isOpen: false })}
              className="w-full px-5 py-3 mt-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* --- KOMPONEN UI MODAL KONFIRMASI --- */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-6 space-y-4 text-center shadow-2xl animate-in zoom-in duration-200">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <HelpCircle className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-white">Konfirmasi</h3>
            <p className="text-sm text-white/70 whitespace-pre-line">{confirmModal.message}</p>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="flex-1 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
                className="flex-1 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}