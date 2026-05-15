"use client";

import { useState, useEffect } from "react";
import { Loader2, X, Save } from "lucide-react";
import { getPackagesAction } from "@/app/actions/packages"; 

type LeadFormProps = {
  initialData?: any;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
};

const EVENT_TYPES = [
  "Pernikahan",
  "Akikah",
  "Khitanan",
  "Ulang Tahun",
  "Gathering Perusahaan",
  "Lainnya"
];

// Fungsi bantuan untuk format mata uang Rupiah
const formatRupiah = (angka: number) => {
  if (!angka) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(angka);
};

export default function LeadForm({ initialData, onSave, onClose }: LeadFormProps) {
  const [packages, setPackages] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    client_name: initialData?.client_name || "",
    client_phone: initialData?.client_phone || "",
    event_type: initialData?.event_type || "Pernikahan",
    custom_event_type: initialData?.custom_event_type || "",
    event_date: initialData?.event_date || "",
    address: initialData?.address || "",
    interested_package_id: initialData?.interested_package_id || "",
    notes: initialData?.notes || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mengambil daftar paket saat form dibuka
  useEffect(() => {
    async function loadPackages() {
      try {
        // Cast ke any untuk menghindari error property 'success' pada type any[]
        const res: any = await getPackagesAction();
        
        if (res && res.success) {
          setPackages(res.data || []);
        } else if (Array.isArray(res)) {
          setPackages(res);
        }
      } catch (error) {
        console.error("Gagal memuat paket", error);
      }
    }
    loadPackages();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payloadToSave = { ...formData };
    
    // 1. Bersihkan custom_event_type jika bukan "Lainnya"
    if (payloadToSave.event_type !== "Lainnya") {
      payloadToSave.custom_event_type = "";
    }
    
    // 2. Pastikan date kosong dikirim sebagai null agar tidak error di DB
    if (!payloadToSave.event_date) {
      payloadToSave.event_date = null as any;
    }

    // 3. Jika tidak ada paket yang dipilih, jadikan null agar tidak error foreign key UUID
    if (!payloadToSave.interested_package_id || payloadToSave.interested_package_id === "") {
      payloadToSave.interested_package_id = null as any; 
    }

    await onSave(payloadToSave);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#111] border border-white/10 rounded-3xl p-6 md:p-8 relative shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Tombol Close */}
        <button 
          type="button"
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-red-500 rounded-full transition-all text-white z-10"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h3 className="text-xl font-bold text-white mb-6">
          {initialData ? "Edit Calon Klien" : "Tambah Calon Klien Baru"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Baris 1: Nama & Kontak */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 font-bold uppercase block mb-2 tracking-widest">Nama Calon Klien</label>
              <input 
                required 
                value={formData.client_name} 
                onChange={(e) => setFormData({...formData, client_name: e.target.value})} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 transition-colors" 
                placeholder="Contoh: Budi & Ani" 
              />
            </div>
            <div>
              <label className="text-xs text-white/50 font-bold uppercase block mb-2 tracking-widest">Nomor WhatsApp</label>
              <input 
                required 
                value={formData.client_phone} 
                onChange={(e) => setFormData({...formData, client_phone: e.target.value})} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 transition-colors" 
                placeholder="Contoh: 0811..." 
              />
            </div>
          </div>

          {/* Baris 2: Jenis Acara & Tanggal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/50 font-bold uppercase block mb-2 tracking-widest">Jenis Acara</label>
              <div className="relative">
                <select 
                  value={formData.event_type} 
                  onChange={(e) => setFormData({...formData, event_type: e.target.value})} 
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 appearance-none cursor-pointer"
                >
                  {EVENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 text-[10px]">▼</div>
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 font-bold uppercase block mb-2 tracking-widest">
                Tanggal Acara <span className="text-white/20 font-normal ml-1">(Opsional)</span>
              </label>
              <input 
                type="date" 
                value={formData.event_date} 
                onChange={(e) => setFormData({...formData, event_date: e.target.value})} 
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 [color-scheme:dark]" 
              />
            </div>
          </div>

          {/* Muncul jika pilih Lainnya */}
          {formData.event_type === "Lainnya" && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <label className="text-xs text-amber-500 font-bold uppercase block mb-2 tracking-widest">Detail Jenis Acara</label>
              <input 
                required 
                value={formData.custom_event_type} 
                onChange={(e) => setFormData({...formData, custom_event_type: e.target.value})} 
                className="w-full bg-amber-500/5 border border-amber-500/30 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500" 
                placeholder="Misal: Wisuda, Peresmian Kantor, dll" 
              />
            </div>
          )}

          {/* Baris 3: Paket diminati */}
          <div>
            <label className="text-xs text-white/50 font-bold uppercase block mb-2 tracking-widest">
              Paket Yang Diminati <span className="text-white/20 font-normal ml-1">(Opsional)</span>
            </label>
            <div className="relative">
              <select 
                value={formData.interested_package_id} 
                onChange={(e) => setFormData({...formData, interested_package_id: e.target.value})} 
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 appearance-none cursor-pointer"
              >
                <option value="">-- Pilih Paket --</option>
                {packages.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>
                    [{pkg.type === 'audio' ? 'AUDIO' : 'DOC'}] {pkg.name} - {pkg.price ? formatRupiah(pkg.price) : 'Harga belum diatur'}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/30 text-[10px]">▼</div>
            </div>
          </div>

          {/* Baris 4: Alamat */}
          <div>
            <label className="text-xs text-white/50 font-bold uppercase block mb-2 tracking-widest">Alamat Acara</label>
            <textarea 
              rows={2} 
              value={formData.address} 
              onChange={(e) => setFormData({...formData, address: e.target.value})} 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 resize-none transition-all" 
              placeholder="Jl. Lengkap, Gedung, atau Lokasi..." 
            />
          </div>

          {/* Baris 5: Catatan */}
          <div>
            <label className="text-xs text-white/50 font-bold uppercase block mb-2 tracking-widest">Catatan Admin</label>
            <textarea 
              rows={2} 
              value={formData.notes} 
              onChange={(e) => setFormData({...formData, notes: e.target.value})} 
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 resize-none transition-all" 
              placeholder="Catatan diskusi, negosiasi, atau request khusus..." 
            />
          </div>

          {/* Footer Tombol */}
          <div className="pt-6 mt-4 border-t border-white/5 flex flex-col-reverse md:flex-row justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <><Save className="w-5 h-5" /> Simpan Calon Klien</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}