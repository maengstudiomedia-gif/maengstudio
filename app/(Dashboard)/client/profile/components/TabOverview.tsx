"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Calendar, MapPin, Clock, FileText } from "lucide-react";
// PERBAIKAN 1: Gunakan alias '@' dan pastikan nama file action-nya benar
import { getClientDashboardData } from "@/app/actions/booking"; 

interface Props {
  onNewBookingClick: () => void;
}

export default function TabOverview({ onNewBookingClick }: Props) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mengambil data dari server action setiap kali tab ini dibuka
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const result = await getClientDashboardData();
        if (result && result.success) {
          setBookings(result.bookings || []);
          setInvoices(result.invoices || []);
        }
      } catch (error) {
        console.error("Gagal mengambil data dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(angka || 0);
  };

  const getServiceName = (type: string) => {
    if (type === 'wedding_doc') return "Dokumentasi Pernikahan";
    if (type === 'event_doc') return "Dokumentasi Event";
    if (type === 'audio_pro') return "Audio System Pro";
    return type || "Layanan Custom";
  };

  // PERBAIKAN 2: Helper untuk memastikan event_details benar-benar Array
  const parseEventDetails = (details: any) => {
    if (!details) return [];
    if (typeof details === 'string') {
      try {
        return JSON.parse(details);
      } catch (error) {
        return [];
      }
    }
    return Array.isArray(details) ? details : [details];
  };

  if (isLoading) {
    return (
      <div className="w-full py-20 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-amber-500/50 text-sm animate-pulse">Menyelaraskan data proyek...</p>
      </div>
    );
  }

  const activeInvoice = invoices.length > 0 ? invoices[0] : null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-xl font-medium">Ringkasan Aktivitas</h3>
        <button
          onClick={onNewBookingClick}
          className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]"
        >
          + Buat Pesanan Baru
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* KOLOM KIRI (Daftar Proyek) */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 backdrop-blur-md">
            <h3 className="text-lg font-medium mb-6">Status Proyek Anda</h3>
            
            {bookings.length === 0 ? (
              <div className="text-center py-10 bg-white/[0.01] rounded-2xl border border-white/[0.02]">
                <FolderOpen className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Belum ada pesanan aktif.</p>
              </div>
            ) : (
              bookings.map((booking) => {
                // Parse detail acara di sini agar aman
                const eventDetails = parseEventDetails(booking.event_details);

                return (
                  <div key={booking.id} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 mb-4 hover:border-white/10 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xs text-amber-500 font-mono mb-1">
                          ID: {booking.id ? booking.id.split('-')[0].toUpperCase() : 'UNKNOWN'}
                        </p>
                        <h4 className="text-lg font-medium text-white/90">{getServiceName(booking.service_type)}</h4>
                      </div>
                      <span className={`px-3 py-1 text-xs rounded-full border font-medium ${
                        booking.status === 'pending_payment' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        booking.status === 'locked' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {booking.status === 'pending_payment' ? 'Menunggu DP' : booking.status === 'locked' ? 'Jadwal Terkunci' : 'Selesai'}
                      </span>
                    </div>

                    {/* Menampilkan Daftar Acara */}
                    {eventDetails.length > 0 ? (
                      <div className="space-y-2 mt-4 border-t border-white/5 pt-4">
                        {eventDetails.map((event: any, idx: number) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-white/60 bg-black/20 p-4 rounded-xl border border-white/5">
                            <div className="col-span-full font-medium text-amber-500 mb-1 flex items-center space-x-2">
                              <FileText className="w-3.5 h-3.5" />
                              <span>{event.eventName || `Sesi Acara ${idx + 1}`}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-white/30 flex-shrink-0"/> 
                              <span>{event.date ? new Date(event.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : '-'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-white/30 flex-shrink-0"/> 
                              <span>Jam {event.startTime || '-'} WIB</span>
                            </div>
                            <div className="col-span-full flex items-start space-x-2 mt-1">
                              <MapPin className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5"/> 
                              <span className="leading-relaxed">{event.address || '-'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                       <div className="text-xs text-white/40 mt-4 p-3 bg-black/20 rounded-xl border border-white/5">Detail acara tidak tersedia.</div>
                    )}
                  </div>
                );
              })
            )}
          </section>
        </div>

        {/* KOLOM KANAN (Tagihan) */}
        <div className="space-y-6">
          <section className="bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/20 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
            <h3 className="text-sm font-medium text-amber-500/80 mb-2 uppercase tracking-wider">Status Tagihan</h3>

            {activeInvoice ? (
              <>
                <p className="text-3xl font-light text-white mb-2">
                  {/* PERBAIKAN 3: Fallback 0 agar tidak terjadi pengurangan tipe 'undefined' */}
                  {formatRupiah((activeInvoice.total_amount || 0) - (activeInvoice.paid_amount || 0))}
                </p>
                <p className="text-xs text-white/50 mb-6">Sisa Pembayaran</p>

                <div className="space-y-3 text-sm border-t border-amber-500/20 pt-4">
                  <div className="flex justify-between text-white/70">
                    <span>Total Biaya</span>
                    <span>{formatRupiah(activeInvoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Sudah Dibayar</span>
                    <span className="text-emerald-400">-{formatRupiah(activeInvoice.paid_amount)}</span>
                  </div>
                  
                  {activeInvoice.payment_status === 'unpaid' && (
                    <div className="flex justify-between text-white/70 border-t border-white/5 pt-2 mt-2 font-medium text-amber-500">
                      <span>Wajib DP (50%)</span>
                      {/* Pastikan db/action mengembalikan dp_amount, atau hitung otomatis: */}
                      <span>{formatRupiah(activeInvoice.dp_amount || ((activeInvoice.total_amount || 0) / 2))}</span>
                    </div>
                  )}
                </div>

                {activeInvoice.payment_status !== 'paid' && (
                  <button className="w-full mt-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    {activeInvoice.payment_status === 'unpaid' ? 'Bayar DP Sekarang' : 'Bayar Pelunasan'}
                  </button>
                )}
              </>
            ) : (
              <p className="text-white/40 text-sm mt-4">Belum ada tagihan aktif.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}