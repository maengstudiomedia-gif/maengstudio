"use client";

import { useState } from "react";
import { Search, ReceiptText, CheckCircle2, Clock3, Edit3, Printer, Store, CheckCircle, Image as ImageIcon } from "lucide-react";
import { findInvoiceByNumberAction } from "@/app/actions/adminBookings";

type InvoiceLookupResult = {
  booking: {
    status?: string;
    invoice_number?: string;
    client_name?: string;
    event_type?: string;
  };
  invoice: {
    updated_at?: string;
  };
  payment: {
    total: number;
    paid: number;
    remaining: number;
    status: string;
  };
  process?: {
    stage?: "awaiting_settlement" | "edit_process" | "print_process" | "completed" | "picked_up";
    paidOffAt?: string;
    editStartedAt?: string;
    printStartedAt?: string;
    completedAt?: string;
    pickedUpAt?: string;
    pickupProofUrl?: string;
  };
  countdown: {
    dpDaysLeft: number | null;
    editDaysLeft: number | null;
    printDaysLeft: number | null;
    editDeadlineDate: string | null;
    printDeadlineDate: string | null;
  };
  progressLabel: string;
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function CekNotaPage() {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<InvoiceLookupResult | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setResult(null);

    const response = await findInvoiceByNumberAction(invoiceNumber);
    if (!response.success) {
      setError(response.error || "Nota tidak ditemukan.");
      setIsLoading(false);
      return;
    }

    setResult(response.data as InvoiceLookupResult);
    setIsLoading(false);
  }

  const booking = result?.booking;
  const payment = result?.payment;
  const process = result?.process || {};
  const invoice = result?.invoice;
  const countdown = result?.countdown || { dpDaysLeft: null, editDaysLeft: null, printDaysLeft: null, editDeadlineDate: null, printDeadlineDate: null };

  const stages = ["awaiting_settlement", "edit_process", "print_process", "completed", "picked_up"];
  const stageIndex = stages.indexOf(process.stage || "awaiting_settlement");
  
  let progress = 0;
  if (stageIndex === 4) progress = 100;
  else if (stageIndex === 3) progress = 80;
  else if (stageIndex === 2) progress = 60;
  else if (stageIndex === 1) progress = 40;
  else if (payment?.status === "paid") progress = 20;
  else if (payment?.paid && payment.paid > 0) progress = 10;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-10 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <header className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Lacak Pesanan Anda</h1>
          <p className="text-white/50 text-sm">Masukkan 16 digit nomor nota Maeng Studio Anda.</p>
        </header>

        <form onSubmit={handleSearch} className="bg-white/[0.03] border border-white/10 rounded-3xl p-4 md:p-6 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <ReceiptText className="w-5 h-5 text-white/40 absolute left-4 top-3.5" />
              <input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Masukkan 16 digit nomor nota yg ada di struk anda"
                maxLength={16}
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white outline-none focus:border-amber-500 transition-all uppercase placeholder:normal-case font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || invoiceNumber.length < 5}
              className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search className="w-4 h-4" /> {isLoading ? "Mencari..." : "Cek Nota"}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 text-center text-sm animate-in fade-in">
            {error}
          </div>
        )}

        {result && booking && payment && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-white/10">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Nomor Nota</p>
                  <p className="text-lg font-mono text-amber-400 mt-1">{booking.invoice_number}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Nama Klien</p>
                  <p className="text-lg font-medium text-white mt-1">{booking.client_name}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Jenis Acara</p>
                  <p className="text-lg font-medium text-white mt-1">{booking.event_type}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Progress Pesanan</p>
                  <p className="text-sm font-bold text-amber-400">{progress}%</p>
                </div>
                <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-1000 ease-out" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
              <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                
                {/* 1. PEMBAYARAN */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#111] bg-emerald-500 text-black shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-white/10 bg-black/40">
                    {payment.status === "paid" ? (
                      <>
                        <h4 className="font-bold text-emerald-400">Sudah Lunas</h4>
                        <p className="text-xs text-white/60 mt-1">Lunas tanggal {formatDate(process.paidOffAt)} sebesar {formatRupiah(payment.total)}.</p>
                      </>
                    ) : (
                      <>
                        <h4 className="font-bold text-amber-400">Menunggu Pelunasan</h4>
                        {payment.paid > 0 && <p className="text-xs text-white/60 mt-1">Pembayaran DP tanggal {formatDate(invoice?.updated_at)} sebesar {formatRupiah(payment.paid)}.</p>}
                        <div className="mt-2 text-xs font-medium text-rose-400 flex items-center gap-1">
                          <Clock3 className="w-3.5 h-3.5" /> 
                          {countdown.dpDaysLeft !== null 
                            ? (countdown.dpDaysLeft > 0 ? `Sisa waktu: ${countdown.dpDaysLeft} hari (H-1 Acara)` : "Batas waktu pelunasan telah tiba (H-1)") 
                            : "Harap segera melunasi tagihan."}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. PROSES EDIT */}
                {(stageIndex >= 1) && (
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#111] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${stageIndex > 1 ? 'bg-emerald-500 text-black' : 'bg-blue-500 text-white animate-pulse'}`}>
                      {stageIndex > 1 ? <CheckCircle2 className="w-5 h-5" /> : <Edit3 className="w-4 h-4" />}
                    </div>
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-white/10 bg-black/40">
                      {stageIndex > 1 ? (
                        <>
                          <h4 className="font-bold text-emerald-400">Selesai Edit</h4>
                          <p className="text-xs text-white/60 mt-1">Proses editing selesai tanggal {formatDate(process.printStartedAt)}.</p>
                        </>
                      ) : (
                        <>
                          <h4 className="font-bold text-blue-400">Sedang Proses Editing</h4>
                          <p className="text-xs text-white/60 mt-1">Maksimal 15 hari setelah tanggal acara terakhir.</p>
                          <div className="mt-2 text-xs font-medium text-blue-300 flex items-center gap-1">
                            <Clock3 className="w-3.5 h-3.5" /> 
                            Estimasi Selesai: {formatDate(countdown.editDeadlineDate)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. PROSES CETAK */}
                {(stageIndex >= 2) && (
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#111] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${stageIndex > 2 ? 'bg-emerald-500 text-black' : 'bg-purple-500 text-white animate-pulse'}`}>
                      {stageIndex > 2 ? <CheckCircle2 className="w-5 h-5" /> : <Printer className="w-4 h-4" />}
                    </div>
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-white/10 bg-black/40">
                      {stageIndex > 2 ? (
                        <>
                          <h4 className="font-bold text-emerald-400">Selesai Cetak</h4>
                          <p className="text-xs text-white/60 mt-1">Proses cetak selesai tanggal {formatDate(process.completedAt)}.</p>
                        </>
                      ) : (
                        <>
                          <h4 className="font-bold text-purple-400">Sedang Proses Cetak</h4>
                          <p className="text-xs text-white/60 mt-1">Maksimal 40 hari setelah tanggal acara terakhir.</p>
                          <div className="mt-2 text-xs font-medium text-purple-300 flex items-center gap-1">
                            <Clock3 className="w-3.5 h-3.5" /> 
                            Estimasi Selesai: {formatDate(countdown.printDeadlineDate)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. SELESAI / READY FOR PICKUP */}
                {(stageIndex >= 3) && (
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-[#111] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${stageIndex > 3 ? 'bg-emerald-500 text-black' : 'bg-amber-500 text-black animate-bounce'}`}>
                      {stageIndex > 3 ? <CheckCircle2 className="w-5 h-5" /> : <Store className="w-4 h-4" />}
                    </div>
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10">
                      <h4 className="font-bold text-amber-400">Pesanan Siap Diambil</h4>
                      <p className="text-xs text-white/70 mt-1 leading-relaxed">
                        Hasil cetakan selesai tanggal {formatDate(process.completedAt)}.<br/> 
                        Silahkan mengunjungi Galeri Maeng Studio untuk mengambil pesanan Anda.
                      </p>
                    </div>
                  </div>
                )}

                {/* 5. SUDAH DIAMBIL / COMPLETE */}
                {(stageIndex === 4) && (
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-[#111] bg-gradient-to-br from-emerald-400 to-emerald-600 text-black shadow-[0_0_15px_rgba(52,211,153,0.5)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <CheckCircle className="w-6 h-6" />
                    </div>
                    <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-3rem)] p-5 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/10 text-center">
                      <span className="inline-block px-3 py-1 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full mb-2">
                        Complete
                      </span>
                      <h4 className="font-bold text-emerald-400 text-lg">Pesanan Telah Diterima</h4>
                      <p className="text-xs text-white/60 mt-1 mb-3">Pesanan diambil pada {formatDate(process.pickedUpAt)}.</p>
                      
                      {process.pickupProofUrl && (
                        <div className="mt-3 overflow-hidden rounded-xl border border-white/10 group cursor-pointer">
                          <div className="bg-black/50 p-2 text-[10px] text-white/50 flex items-center justify-center gap-1 uppercase tracking-widest">
                            <ImageIcon className="w-3 h-3" /> Bukti Pengambilan
                          </div>
                          <img src={process.pickupProofUrl} alt="Bukti" className="w-full h-auto opacity-80 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}