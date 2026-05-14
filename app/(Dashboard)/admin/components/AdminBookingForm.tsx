"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Save, Plus, Trash2, Loader2, Calendar, MapPin, Clock, CheckCircle2, Package as PackageIcon } from "lucide-react";
import { generateInvoiceNumberAction, createAdminBookingAction } from "@/app/actions/adminBookings";
import { extractDateKeysFromEventDetails } from "@/lib/bookingCalendar/extractDateKeysFromEventDetails";
import { validateBookingEventDatesAction } from "@/app/actions/bookingCalendarActions";
import AlertModal from "./AlertModal";
import EventDateAvailabilityHint from "@/app/components/bookingCalendar/EventDateAvailabilityHint";

interface AdminBookingFormProps {
  userId: string;
  selectedPackage: any;
  allPackages: any[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AdminBookingForm({ userId, selectedPackage, allPackages = [], onSuccess, onCancel }: AdminBookingFormProps) {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("Loading...");
  const [alertState, setAlertState] = useState({ isOpen: false, title: "", message: "", variant: "error" as "error" | "success" | "info" });

  // Form Dasar
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [eventType, setEventType] = useState("Pernikahan");
  const [customEventType, setCustomEventType] = useState("");
  const [bookerType, setBookerType] = useState("sendiri");
  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");

  // Logika Paket Tambahan
  const [hasAddons, setHasAddons] = useState(false);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  // State Level Acara
  const [events, setEvents] = useState([
    { id: Date.now().toString(), title: "Acara Utama", date: "", time: "", address: "" }
  ]);

  useEffect(() => {
    setMounted(true);
    const fetchInvoice = async () => {
      try {
        const nota = await generateInvoiceNumberAction();
        setInvoiceNumber(nota || "001/Maengstudio/ERR");
      } catch (err) {
        setInvoiceNumber("Gagal Load Nota");
      }
    };
    fetchInvoice();
  }, []);

  const availableAddons = useMemo(() => {
    return allPackages.filter(pkg => pkg.id !== selectedPackage?.id);
  }, [allPackages, selectedPackage]);

  const totalAmount = useMemo(() => {
    const basePrice = Number(selectedPackage?.price) || 0;
    const addonPrice = allPackages
      .filter(pkg => selectedAddonIds.includes(pkg.id))
      .reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
    return basePrice + addonPrice;
  }, [selectedPackage, selectedAddonIds, allPackages]);

  const toggleAddon = (id: string) => {
    setSelectedAddonIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleAddEvent = () => {
    setEvents([...events, { id: Date.now().toString(), title: `Acara ${events.length + 1}`, date: "", time: "", address: "" }]);
  };

  const handleUpdateEvent = (index: number, field: string, value: string) => {
    if (field === 'remove') {
        setEvents(events.filter((_, i) => i !== index));
        return;
    }
    const newEvents = [...events];
    newEvents[index] = { ...newEvents[index], [field]: value };
    setEvents(newEvents);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const payload = {
      userId,
      invoice_number: invoiceNumber,
      package_id: selectedPackage?.id || "",
      service_type: selectedPackage?.type,
      addon_package_ids: selectedAddonIds,
      total_price: Number(totalAmount) || 0,
      client_name: clientName,
      client_phone: clientPhone,
      event_type: eventType,
      custom_event_type: customEventType,
      booker_type: bookerType,
      bride_name: brideName,
      groom_name: groomName,
      event_details: events
    };

    try {
      const dateKeys = extractDateKeysFromEventDetails(events);
      const cap = await validateBookingEventDatesAction({ dateKeys, excludeBookingId: null });
      if (!cap.success) {
        setAlertState({
          isOpen: true,
          title: "Jadwal tidak tersedia",
          message: cap.error || "Tanggal penuh.",
          variant: "error",
        });
        setIsLoading(false);
        return;
      }

      const result = await createAdminBookingAction(payload);
      if (result.success) {
        onSuccess();
      } else {
        setAlertState({
          isOpen: true,
          title: "Gagal Menyimpan Pesanan",
          message: result.error || "Terjadi kesalahan saat menyimpan data pesanan.",
          variant: "error",
        });
        setIsLoading(false);
      }
    } catch (err) {
      setAlertState({
        isOpen: true,
        title: "Gangguan Jaringan",
        message: "Koneksi sedang bermasalah. Coba ulangi dalam beberapa saat.",
        variant: "error",
      });
      setIsLoading(false);
    }
  };

  const formatRupiah = (angka: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(angka || 0);

  // Helper untuk merender isi kartu paket tambahan
  const renderCardContent = (pkg: any) => {
    const isSelected = selectedAddonIds.includes(pkg.id);
    const isAudio = pkg.type === "audio";
    const features = typeof pkg.features === 'string' ? JSON.parse(pkg.features) : (pkg.features || []);

    return (
      <div 
        key={pkg.id} 
        onClick={() => toggleAddon(pkg.id)}
        className={`relative p-4 rounded-3xl border transition-all duration-300 cursor-pointer group flex flex-col h-full ${
          isSelected ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'bg-white/[0.02] border-white/5 hover:border-white/20'
        }`}
      >
        {/* Badge & Check */}
        <div className="flex justify-between items-start mb-4">
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter border ${isAudio ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
            {isAudio ? 'Audio' : 'Visual'}
          </span>
          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-white/10'}`}>
            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
          </div>
        </div>

        {/* Image Preview (Small) */}
        <div className="w-full h-24 bg-white/5 rounded-2xl mb-3 overflow-hidden border border-white/5">
          {pkg.image_url ? (
            <img src={pkg.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><PackageIcon className="w-6 h-6 text-white/10" /></div>
          )}
        </div>

        <h5 className="text-sm font-bold text-white mb-1 leading-tight line-clamp-1">{pkg.name}</h5>
        <p className="text-amber-500 font-bold text-sm mb-3">{formatRupiah(pkg.price)}</p>

        {/* Tiny Features */}
        <div className="space-y-1 mt-auto">
          {features.slice(0, 2).map((f: string, i: number) => (
            <div key={i} className="flex items-center text-[10px] text-white/40">
              <div className="w-1 h-1 bg-amber-500 rounded-full mr-2 shrink-0" />
              <span className="line-clamp-1">{f}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/95 backdrop-blur-md custom-scrollbar animate-in fade-in duration-300">
      <div className="flex min-h-full items-center justify-center p-4 md:p-10">
        <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-5xl rounded-[2.5rem] p-6 md:p-10 relative shadow-2xl">
          
          <button onClick={onCancel} type="button" className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-red-500 hover:text-white rounded-full transition-all z-20">
            <X className="w-6 h-6" />
          </button>

          <div className="mb-10">
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center">
              <div className="w-2 h-10 bg-amber-500 rounded-full mr-4" /> Buat Pesanan Baru
            </h3>
            <p className="text-white/40 ml-6">Input data detail pesanan untuk paket <span className="text-amber-500 font-bold">{selectedPackage?.name}</span></p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* DATA DASAR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4">
                <label className="text-[10px] text-white/40 uppercase tracking-widest block mb-1 font-bold">Nomor Nota</label>
                <div className="text-amber-500 font-mono font-bold text-lg">{invoiceNumber}</div>
              </div>
              <input required value={clientName} onChange={(e)=>setClientName(e.target.value)} placeholder="Nama Klien" className="bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500" />
              <input required value={clientPhone} onChange={(e)=>setClientPhone(e.target.value)} placeholder="No. WhatsApp" className="bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500" />
            </div>

            {/* DETAIL ACARA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Jenis Acara</label>
                <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500">
                  <option value="Pernikahan">Pernikahan</option>
                  <option value="Khitan">Khitanan</option>
                  <option value="Aqiqah">Aqiqah</option>
                  <option value="Ulang Tahun">Ulang Tahun</option>
                  <option value="Lainnya">Lainnya...</option>
                </select>
                {eventType === "Lainnya" && (
                  <input required value={customEventType} onChange={(e)=>setCustomEventType(e.target.value)} placeholder="Jenis acara lainnya..." className="w-full bg-white/[0.03] border border-amber-500/50 rounded-2xl px-5 py-4 text-white outline-none" />
                )}
              </div>

              <div className="space-y-4">
                <label className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Status Pemesan</label>
                <select value={bookerType} onChange={(e) => setBookerType(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-amber-500">
                  <option value="sendiri">Memesan untuk Sendiri</option>
                  <option value="orang_lain">Memesankan Orang Lain</option>
                </select>
                
                {/* KONDISI PERBAIKAN: Hanya muncul jika Pernikahan DAN dipesankan orang lain */}
                {eventType === "Pernikahan" && bookerType === "orang_lain" && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <input placeholder="Nama Pria" required value={groomName} onChange={(e)=>setGroomName(e.target.value)} className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500" />
                    <input placeholder="Nama Wanita" required value={brideName} onChange={(e)=>setBrideName(e.target.value)} className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500" />
                  </div>
                )}
              </div>
            </div>

            {/* RANGKAIAN ACARA */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-bold text-white flex items-center"><Calendar className="w-5 h-5 mr-2 text-amber-500"/> Jadwal Pelaksanaan</h4>
                <button type="button" onClick={handleAddEvent} className="text-[10px] text-amber-500 font-bold flex items-center bg-amber-500/10 px-4 py-2 rounded-xl hover:bg-amber-500/20 transition-all">
                  <Plus className="w-3.5 h-3.5 mr-2" /> TAMBAH HARI
                </button>
              </div>
              <EventDateAvailabilityHint events={events} />
              {events.map((event, index) => (
                <div key={event.id} className="p-6 bg-white/[0.01] border border-white/5 rounded-[2rem] grid grid-cols-1 md:grid-cols-3 gap-6 relative group">
                  {events.length > 1 && (
                    <button type="button" onClick={() => handleUpdateEvent(index, 'remove', '')} className="absolute top-6 right-6 text-white/20 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                  )}
                  <div className="space-y-2">
                    <label className="text-[9px] text-white/30 uppercase font-bold ml-1">Tanggal</label>
                    <input type="date" required value={event.date} onChange={(e) => handleUpdateEvent(index, 'date', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] text-white/30 uppercase font-bold ml-1">Jam Mulai</label>
                    <input type="time" required value={event.time} onChange={(e) => handleUpdateEvent(index, 'time', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] text-white/30 uppercase font-bold ml-1">Keterangan</label>
                    <input placeholder="Msl: Akad Nikah" required value={event.title} onChange={(e) => handleUpdateEvent(index, 'title', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500" />
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-[9px] text-white/30 uppercase font-bold ml-1">Alamat Lokasi</label>
                    <textarea placeholder="Nama gedung, jalan, dan patokan..." rows={2} required value={event.address} onChange={(e) => handleUpdateEvent(index, 'address', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none resize-none focus:border-amber-500" />
                  </div>
                </div>
              ))}
            </div>

            {/* PAKET TAMBAHAN */}
            <div className="pt-10 border-t border-white/5">
              <div className="flex items-center space-x-4 mb-6">
                <input 
                  type="checkbox" 
                  id="hasAddons" 
                  checked={hasAddons} 
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasAddons(checked);
                    // Reset pilihan addon saat checkbox dihilangkan centangnya
                    if (!checked) {
                      setSelectedAddonIds([]);
                    }
                  }}
                  className="w-6 h-6 rounded-lg bg-black border-white/20 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="hasAddons" className="text-lg font-bold text-white cursor-pointer select-none">Apakah ada paket tambahan lainnya?</label>
              </div>

              {hasAddons && (
                <div className="animate-in zoom-in-95 duration-300">
                  {availableAddons.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {availableAddons.map((pkg) => renderCardContent(pkg))}
                    </div>
                  ) : (
                    <div className="p-10 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-2xl text-white/30">
                        <PackageIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Tidak ada paket lain yang tersedia untuk ditambahkan.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* TOTAL HARGA & SUBMIT */}
            <div className="sticky bottom-0 bg-[#0a0a0a] pt-6 pb-2 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 z-30">
              <div className="text-center md:text-left">
                <p className="text-[10px] uppercase text-white/40 font-bold tracking-widest mb-1">Total Biaya Pesanan</p>
                <h2 className="text-4xl font-black text-amber-500">{formatRupiah(totalAmount)}</h2>
              </div>
              <button type="submit" disabled={isLoading} className="w-full md:w-auto bg-amber-500 hover:bg-amber-400 py-5 px-12 rounded-2xl font-black text-black flex items-center justify-center transition-all shadow-[0_0_50px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95">
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-6 h-6 mr-3" /> Konfirmasi & Simpan Pesanan</>}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(
    <>
      {modalContent}
      <AlertModal
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        variant={alertState.variant}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
      />
    </>,
    document.body
  );
}