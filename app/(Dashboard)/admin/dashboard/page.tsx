"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, Search, Loader2, X, ReceiptText, ChevronRight } from "lucide-react";
import { getAdminBookingsAction } from "@/app/actions/adminBookings";
import AdminBookingCalendarPanel from "@/app/components/bookingCalendar/AdminBookingCalendarPanel";

// Fungsi Helper Format Rupiah
function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

// Tipe Data Sederhana untuk Dashboard
type DashboardBooking = {
  id: string;
  invoice_number: string;
  client_name: string;
  package_name: string;
  created_at: string;
  event_details?: unknown;
  invoice?: {
    total_amount: number;
    paid_amount: number;
    payment_status: string;
  };
  process?: {
    stage: string;
  };
};

type FilterType = "menunggu_dp" | "menunggu_pelunasan" | "proses_edit" | "proses_cetak" | "menunggu_diambil" | "selesai" | null;

export default function AdminDashboardPage() {
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);
      const res = await getAdminBookingsAction();
      if (res.success) {
        setBookings((res.data || []) as DashboardBooking[]);
      }
      setIsLoading(false);
    }
    fetchDashboardData();
  }, []);

  // --- MENGHITUNG STATISTIK ---
  const stats = useMemo(() => {
    let pendapatanBulanIni = 0;
    let menungguDp = 0;
    let menungguPelunasan = 0;
    let prosesEdit = 0;
    let prosesCetak = 0;
    let menungguDiambil = 0;
    let selesai = 0;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    bookings.forEach((b) => {
      const inv = b.invoice || { total_amount: 0, paid_amount: 0, payment_status: "unpaid" };
      const proc = b.process || { stage: "awaiting_settlement" };
      
      // 1. Pendapatan Bulan Ini (Dari pesanan yang dibuat bulan ini)
      const bookingDate = new Date(b.created_at);
      if (bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear) {
        pendapatanBulanIni += Number(inv.paid_amount || 0);
      }

      // 2. Kategori Status
      const isPaid = inv.payment_status === "paid";
      const paidAmount = Number(inv.paid_amount || 0);

      if (!isPaid && paidAmount === 0) menungguDp++;
      else if (!isPaid && paidAmount > 0) menungguPelunasan++;
      else if (isPaid && proc.stage === "edit_process") prosesEdit++;
      else if (isPaid && proc.stage === "print_process") prosesCetak++;
      else if (isPaid && proc.stage === "completed") menungguDiambil++;
      else if (isPaid && proc.stage === "picked_up") selesai++;
      // Jika paid tapi stage masih awaiting_settlement (baru saja lunas tapi belum diproses)
      else if (isPaid && proc.stage === "awaiting_settlement") prosesEdit++; 
    });

    return { pendapatanBulanIni, menungguDp, menungguPelunasan, prosesEdit, prosesCetak, menungguDiambil, selesai };
  }, [bookings]);

  // --- FILTER LIST PESANAN ---
  const filteredBookings = useMemo(() => {
    if (!activeFilter) return [];
    return bookings.filter((b) => {
      const inv = b.invoice || { total_amount: 0, paid_amount: 0, payment_status: "unpaid" };
      const proc = b.process || { stage: "awaiting_settlement" };
      const isPaid = inv.payment_status === "paid";
      const paidAmount = Number(inv.paid_amount || 0);

      if (activeFilter === "menunggu_dp") return !isPaid && paidAmount === 0;
      if (activeFilter === "menunggu_pelunasan") return !isPaid && paidAmount > 0;
      if (activeFilter === "proses_edit") return isPaid && (proc.stage === "edit_process" || proc.stage === "awaiting_settlement");
      if (activeFilter === "proses_cetak") return isPaid && proc.stage === "print_process";
      if (activeFilter === "menunggu_diambil") return isPaid && proc.stage === "completed";
      if (activeFilter === "selesai") return isPaid && proc.stage === "picked_up";
      return false;
    });
  }, [bookings, activeFilter]);

  // Label untuk Judul Filter
  const filterLabels: Record<NonNullable<FilterType>, string> = {
    menunggu_dp: "Menunggu DP",
    menunggu_pelunasan: "Menunggu Pelunasan",
    proses_edit: "Sedang Proses Edit",
    proses_cetak: "Sedang Proses Cetak",
    menunggu_diambil: "Menunggu Pengambilan",
    selesai: "Pesanan Selesai / Diambil"
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header Admin */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-6 border-b border-white/[0.05] gap-4">
        <div>
          <div className="flex items-center space-x-2 text-rose-500 mb-2">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-xs tracking-wider uppercase">Pusat Kendali Utama</span>
          </div>
          <h2 className="text-3xl font-light">Ringkasan Sistem</h2>
        </div>
        
        {/* Search Bar (Opsional di halaman ini) */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-3 w-4 h-4 text-white/30" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Pesanan Cepat..." 
            className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center items-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : (
        <>
          <AdminBookingCalendarPanel
            bookings={bookings.map((b) => ({
              id: b.id,
              client_name: b.client_name,
              event_details: b.event_details,
            }))}
          />

          {/* KARTU PENDAPATAN (Non-Clickable) */}
          <div className="mb-6">
            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-900/10 border border-emerald-500/20 rounded-3xl p-6 md:p-8">
              <p className="text-sm font-medium text-emerald-400 mb-2">Pendapatan Masuk (Bulan Ini)</p>
              <h4 className="text-4xl md:text-5xl font-light text-white tracking-tight">
                {formatRupiah(stats.pendapatanBulanIni)}
              </h4>
            </div>
          </div>

          {/* GRID KARTU STATISTIK (Clickable) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
            {[
              { id: "menunggu_dp", label: "Menunggu DP", count: stats.menungguDp, color: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-500/5", activeBg: "bg-rose-500/20 ring-1 ring-rose-500" },
              { id: "menunggu_pelunasan", label: "Menunggu Lunas", count: stats.menungguPelunasan, color: "text-amber-400", border: "border-amber-500/20", bg: "bg-amber-500/5", activeBg: "bg-amber-500/20 ring-1 ring-amber-500" },
              { id: "proses_edit", label: "Proses Edit", count: stats.prosesEdit, color: "text-blue-400", border: "border-blue-500/20", bg: "bg-blue-500/5", activeBg: "bg-blue-500/20 ring-1 ring-blue-500" },
              { id: "proses_cetak", label: "Proses Cetak", count: stats.prosesCetak, color: "text-purple-400", border: "border-purple-500/20", bg: "bg-purple-500/5", activeBg: "bg-purple-500/20 ring-1 ring-purple-500" },
              { id: "menunggu_diambil", label: "Siap Diambil", count: stats.menungguDiambil, color: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5", activeBg: "bg-emerald-500/20 ring-1 ring-emerald-500" },
              { id: "selesai", label: "Selesai", count: stats.selesai, color: "text-white/60", border: "border-white/10", bg: "bg-white/[0.02]", activeBg: "bg-white/[0.08] ring-1 ring-white/30" },
            ].map((card) => (
              <button
                key={card.id}
                onClick={() => setActiveFilter(activeFilter === card.id ? null : (card.id as FilterType))}
                className={`text-left rounded-2xl p-4 transition-all duration-200 border ${card.border} ${
                  activeFilter === card.id ? card.activeBg : `${card.bg} hover:bg-white/[0.05]`
                }`}
              >
                <h4 className={`text-2xl font-light mb-1 ${card.color}`}>{card.count}</h4>
                <p className="text-xs text-white/60 font-medium">{card.label}</p>
              </button>
            ))}
          </div>

          {/* LIST NOTA YANG DI-FILTER */}
          {activeFilter && (
            <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/[0.02]">
                <h3 className="text-xl font-medium text-white flex items-center gap-2">
                  <ReceiptText className="w-5 h-5 text-amber-500" />
                  Daftar Pesanan: <span className="text-amber-500">{filterLabels[activeFilter]}</span>
                </h3>
                <button 
                  onClick={() => setActiveFilter(null)}
                  className="p-2 rounded-full hover:bg-white/10 text-white/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-2">
                {filteredBookings.length === 0 ? (
                  <div className="text-center py-12 text-white/40 text-sm">
                    Tidak ada pesanan di kategori ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-white/40 uppercase text-[10px] tracking-wider border-b border-white/5">
                        <tr>
                          <th className="px-6 py-4">Nomor Nota</th>
                          <th className="px-6 py-4">Nama Klien</th>
                          <th className="px-6 py-4">Paket</th>
                          <th className="px-6 py-4 text-right">Info Pembayaran</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.map((b) => {
                          const total = b.invoice?.total_amount || 0;
                          const paid = b.invoice?.paid_amount || 0;
                          const sisa = Math.max(total - paid, 0);

                          return (
                            <tr key={b.id} className="border-b border-white/5 hover:bg-white/[0.02] group">
                              <td className="px-6 py-4 font-mono text-amber-400">{b.invoice_number}</td>
                              <td className="px-6 py-4 text-white font-medium">{b.client_name}</td>
                              <td className="px-6 py-4 text-white/70">{b.package_name}</td>
                              <td className="px-6 py-4 text-right">
                                {b.invoice?.payment_status === "paid" ? (
                                  <span className="text-emerald-400 font-medium">Lunas</span>
                                ) : (
                                  <div className="flex flex-col items-end">
                                    <span className="text-white/50 text-xs">Sisa Tagihan:</span>
                                    <span className="text-rose-400 font-bold">{formatRupiah(sisa)}</span>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {!activeFilter && (
            <div className="text-center py-16 bg-white/[0.01] rounded-3xl border border-white/[0.02]">
              <p className="text-white/40 text-sm">Pilih salah satu kartu di atas untuk melihat daftar detail nota.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}