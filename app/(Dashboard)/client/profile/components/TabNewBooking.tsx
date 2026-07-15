"use client";

import { useState, useEffect } from "react";
import { 
  CheckCircle2, ArrowLeft, ArrowRight, Plus, Trash2, 
  Send, Calendar, MapPin, Clock, Info, Loader2, AlertCircle
} from "lucide-react";
import { getPackagesAction } from "@/app/actions/packages";
import { createNewBookingAction } from "@/app/actions/booking";
import EventDateAvailabilityHint from "@/app/components/bookingCalendar/EventDateAvailabilityHint";

interface TabNewBookingProps {
  userId: string;
  onBack: () => void;
}

// Tipe data untuk Modal
interface ModalState {
  isOpen: boolean;
  type: "success" | "error" | "warning" | null;
  title: string;
  message: string;
}

export default function TabNewBooking({ userId, onBack }: TabNewBookingProps) {
  const [step, setStep] = useState<"catalog" | "form">("catalog");
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STATE MODAL ---
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: null,
    title: "",
    message: "",
  });

  // --- STATE FORMULIR ---
  const [events, setEvents] = useState([
    { id: Date.now().toString(), date: "", address: "", eventName: "", startTime: "" }
  ]);
  const [notes, setNotes] = useState(""); // State untuk catatan tambahan

  useEffect(() => {
    async function fetchPackages() {
      try {
        const data = await getPackagesAction();
        setPackages(data);
      } catch (error) {
        console.error("Gagal mengambil paket:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPackages();
  }, []);

  const handleSelectPackage = (pkg: any) => {
    setSelectedPackage(pkg);
    setStep("form");
  };

  const addEvent = () => {
    if (events.length < 2) {
      setEvents([...events, { id: Date.now().toString(), date: "", address: "", eventName: "", startTime: "" }]);
    }
  };

  const removeEvent = (index: number) => {
    if (events.length > 1) {
      setEvents(events.filter((_, i) => i !== index));
    }
  };

  const updateEvent = (index: number, field: string, value: string) => {
    const newEvents = [...events];
    newEvents[index] = { ...newEvents[index], [field]: value };
    setEvents(newEvents);
  };

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(angka);
  };

  // --- FUNGSI SUBMIT PESANAN KE DATABASE ---
  const handleSubmitBooking = async () => {
    const isFormValid = events.every(e => e.date !== "" && e.eventName !== "" && e.startTime !== "" && e.address !== "");
    
    if (!isFormValid) {
      setModal({
        isOpen: true,
        type: "warning",
        title: "Data Belum Lengkap",
        message: "Mohon lengkapi semua detail acara (tanggal, nama, jam, dan lokasi) sebelum membuat pesanan."
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Siapkan data yang akan dikirim ke Server Action
      const payload = {
        userId,
        packageId: selectedPackage.id,
        events,
        notes,
        totalPrice: selectedPackage.price,
        dpAmount: selectedPackage.price * 0.5
      };

      // Memanggil Server Action untuk insert ke Database
      const result = await createNewBookingAction(payload as any);
      if (!result.success) {
        setModal({
          isOpen: true,
          type: "error",
          title: "Pesanan tidak dapat dibuat",
          message: result.message || "Silakan periksa kembali data atau pilih tanggal lain.",
        });
        return;
      }

      // Tampilkan Modal Sukses jika berhasil
      setModal({
        isOpen: true,
        type: "success",
        title: "Pesanan Berhasil!",
        message: "Pesanan Anda telah berhasil dibuat. Silakan cek detail tagihan untuk langkah selanjutnya."
      });
      
    } catch (error) {
      console.error("Gagal membuat pesanan:", error);
      setModal({
        isOpen: true,
        type: "error",
        title: "Terjadi Kesalahan",
        message: "Maaf, sistem kami gagal memproses pesanan Anda. Silakan coba beberapa saat lagi."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- FUNGSI TUTUP MODAL ---
  const handleCloseModal = () => {
    const isSuccess = modal.type === "success";
    setModal({ ...modal, isOpen: false });
    
    // Jika sukses dan ditutup, kembalikan user ke halaman list pesanan/invoice
    if (isSuccess) {
      onBack();
    }
  };

  const dpAmount = selectedPackage ? selectedPackage.price * 0.5 : 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-light text-white">
            {step === "catalog" ? "Pilih Paket Layanan" : "Detail Pemesanan"}
          </h3>
          <p className="text-white/50 text-sm mt-1">
            {step === "catalog" 
              ? "Pilih paket yang paling sesuai dengan kebutuhan dokumentasi acara Anda." 
              : `Anda memilih paket: ${selectedPackage?.name}`}
          </p>
        </div>
        <button 
          onClick={() => step === "catalog" ? onBack() : setStep("catalog")}
          className="flex items-center text-sm text-white/50 hover:text-amber-500 bg-white/[0.02] border border-white/[0.05] px-4 py-2 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === "catalog" ? "Kembali" : "Ganti Paket"}
        </button>
      </div>

      {/* STEP 1: KATALOG PAKET */}
      {step === "catalog" && (
        isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-20 text-white/50 bg-white/[0.02] rounded-2xl border border-white/[0.05]">
            Belum ada paket yang tersedia. Harap tunggu admin menambahkannya.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div 
                key={pkg.id} 
                className={`relative flex flex-col p-6 rounded-2xl border transition-all duration-300 ${
                  pkg.is_popular 
                    ? "bg-amber-500/[0.03] border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.05)]" 
                    : "bg-white/[0.02] border-white/[0.05] hover:border-white/[0.1]"
                }`}
              >
                {pkg.is_popular && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500 text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Paling Diminati
                  </div>
                )}

                <div className="mb-6 rounded-3xl overflow-hidden h-44 bg-white/[0.03] border border-white/[0.05]">
                  {pkg.image_url || pkg.image ? (
                    <img src={pkg.image_url || pkg.image} alt={pkg.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <img src="/favicon.ico" alt="Maeng Studio" className="w-7 h-7 object-contain" />
                    </div>
                  )}
                </div>
                
                <h4 className="text-xl font-medium text-white mb-2">{pkg.name}</h4>
                <p className="text-white/50 text-sm mb-4 min-h-[40px] leading-relaxed">
                  {pkg.description || "Tidak ada deskripsi."}
                </p>
                
                <div className="text-2xl font-bold text-amber-500 mb-6">
                  {formatRupiah(pkg.price)}
                </div>

                <div className="flex-1 space-y-3 mb-8">
                  {pkg.features && (typeof pkg.features === 'string' ? JSON.parse(pkg.features) : pkg.features).map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-start text-sm text-white/70">
                      <CheckCircle2 className="w-4 h-4 text-amber-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="leading-tight">{feature}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => handleSelectPackage(pkg)}
                  className={`w-full py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center group ${
                    pkg.is_popular
                      ? "bg-amber-500 text-black hover:bg-amber-400 hover:scale-[1.02]"
                      : "bg-white/[0.05] text-white hover:bg-white/[0.1]"
                  }`}
                >
                  Pilih Paket
                  <ArrowRight className={`w-4 h-4 ml-2 transition-transform duration-300 ${pkg.is_popular ? "group-hover:translate-x-1" : ""}`} />
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* STEP 2: FORMULIR PEMESANAN */}
      {step === "form" && (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
          
          {/* BAGIAN 1: INFORMASI PAKET */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl"></div>
            <div className="space-y-2 relative z-10">
              <label className="text-[10px] uppercase tracking-widest text-white/40 font-medium flex items-center">
                Nama Paket Terpilih
              </label>
              <input value={selectedPackage?.name} disabled className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 text-white/50 cursor-not-allowed" />
            </div>
            <div className="space-y-2 relative z-10">
              <label className="text-[10px] uppercase tracking-widest text-white/40 font-medium flex items-center">
                Harga Paket
              </label>
              <input value={formatRupiah(selectedPackage?.price)} disabled className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 text-white/50 cursor-not-allowed" />
            </div>
          </div>

          {/* BAGIAN 2: DINAMIS TANGGAL & CATATAN */}
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
              <h4 className="text-lg font-medium text-white flex items-center">
                <Calendar className="w-5 h-5 text-amber-500 mr-2" /> Detail Acara
              </h4>
              {events.length < 2 && (
                <button onClick={addEvent} className="text-sm text-amber-500 flex items-center hover:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus className="w-4 h-4 mr-1" /> Tambah Hari Acara
                </button>
              )}
            </div>

            <EventDateAvailabilityHint events={events} />

            {events.map((event, index) => (
              <div key={event.id} className="relative p-6 bg-white/[0.01] border border-white/[0.05] rounded-2xl space-y-6 shadow-sm">
                
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs uppercase tracking-widest text-amber-500 font-bold bg-amber-500/10 px-3 py-1 rounded-full">
                    Acara Hari {index + 1}
                  </span>
                  {index > 0 && (
                    <button onClick={() => removeEvent(index)} className="text-white/30 hover:text-red-500 flex items-center text-xs transition-colors">
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase text-white/40 flex items-center"><Calendar className="w-3 h-3 mr-1.5"/> Tanggal Pelaksanaan</label>
                    <input type="date" required value={event.date} onChange={(e) => updateEvent(index, 'date', e.target.value)} className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5 text-sm text-white focus:bg-white/[0.05] focus:border-amber-500/50 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase text-white/40 flex items-center"><Info className="w-3 h-3 mr-1.5"/> Nama Acara</label>
                    <input placeholder="Contoh: Akad Nikah" required value={event.eventName} onChange={(e) => updateEvent(index, 'eventName', e.target.value)} className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5 text-sm text-white focus:bg-white/[0.05] focus:border-amber-500/50 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase text-white/40 flex items-center"><Clock className="w-3 h-3 mr-1.5"/> Jam Mulai</label>
                    <input type="time" required value={event.startTime} onChange={(e) => updateEvent(index, 'startTime', e.target.value)} className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5 text-sm text-white focus:bg-white/[0.05] focus:border-amber-500/50 outline-none transition-all" />
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-[10px] uppercase text-white/40 flex items-center"><MapPin className="w-3 h-3 mr-1.5"/> Alamat & Lokasi Lengkap</label>
                    <textarea rows={2} required value={event.address} onChange={(e) => updateEvent(index, 'address', e.target.value)} placeholder="Tuliskan nama gedung, jalan, atau patokan lokasi..." className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl p-3.5 text-sm text-white focus:bg-white/[0.05] focus:border-amber-500/50 outline-none resize-none transition-all" />
                  </div>
                </div>
              </div>
            ))}

            {/* Catatan Tambahan */}
            <div className="space-y-2 pt-2">
              <label className="text-[10px] uppercase text-white/40 flex items-center">
                <Info className="w-3 h-3 mr-1.5"/> Catatan Tambahan (Opsional)
              </label>
              <textarea 
                rows={3} 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Ada request khusus atau informasi lain yang perlu kami ketahui?" 
                className="w-full bg-white/[0.01] border border-white/[0.05] rounded-xl p-4 text-sm text-white focus:bg-white/[0.03] focus:border-amber-500/50 outline-none resize-none transition-all shadow-sm" 
              />
            </div>
          </div>

          {/* BAGIAN 3: INVOICE & DP */}
          <div className="p-8 bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 rounded-3xl relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-500/20 blur-3xl rounded-full"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-amber-500/80 font-bold mb-1">
                  Tagihan Uang Muka (DP 50%)
                </p>
                <h4 className="text-4xl font-light text-amber-400 tracking-tight">
                  {formatRupiah(dpAmount)}
                </h4>
                <p className="text-xs text-white/40 mt-2">
                  Total harga paket: <span className="line-through">{formatRupiah(selectedPackage?.price || 0)}</span>
                </p>
                <p className="text-[10px] text-white/30 italic mt-1">
                  *Sisa pelunasan sebesar 50% dibayarkan maksimal H-7 sebelum acara.
                </p>
              </div>
              
              <button 
                onClick={handleSubmitBooking}
                disabled={isSubmitting}
                className={`px-8 py-5 rounded-2xl font-bold flex items-center justify-center transition-all transform ${
                  isSubmitting 
                    ? "bg-amber-500/50 text-black/50 cursor-not-allowed" 
                    : "bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_40px_rgba(245,158,11,0.25)] hover:scale-[1.03]"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" /> Sedang Memproses...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-3" /> Konfirmasi & Buat Pesanan
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* OVERLAY MODAL (Sudah z-[99999] agar tidak tertimpa sidebar) */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            {/* Ikon Modal */}
            <div className="flex justify-center mb-5">
              {modal.type === "success" && (
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              )}
              {modal.type === "error" && (
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
              )}
              {modal.type === "warning" && (
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                </div>
              )}
            </div>

            {/* Teks Konten */}
            <h3 className="text-xl font-medium text-white text-center mb-2">
              {modal.title}
            </h3>
            <p className="text-white/60 text-center text-sm mb-6 leading-relaxed">
              {modal.message}
            </p>

            {/* Tombol Aksi Modal */}
            <button
              onClick={handleCloseModal}
              className={`w-full py-3 rounded-xl font-medium transition-colors ${
                modal.type === "success" 
                  ? "bg-amber-500 hover:bg-amber-400 text-black" 
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              {modal.type === "success" ? "Tutup & Kembali" : "Mengerti"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}