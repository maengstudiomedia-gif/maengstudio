"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom"; // IMPORT BARU
import { Save, Loader2, X, Upload } from "lucide-react";
import { createPackageAction, updatePackageAction } from "@/app/actions/packages";

interface PackageFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PackageForm({ initialData, onSuccess, onCancel }: PackageFormProps) {
  // STATE BARU: Untuk memastikan portal hanya berjalan di sisi Client (Browser)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editingId = initialData?.id || null;
  const [type, setType] = useState<"audio" | "dokumentasi">(initialData?.type || "audio");
  const [name, setName] = useState(initialData?.name || "");
  const [price, setPrice] = useState(initialData?.price?.toString() || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [isPopular, setIsPopular] = useState(initialData?.is_popular || false);
  
  const [features, setFeatures] = useState<string[]>(
    initialData?.features ? (typeof initialData.features === 'string' ? JSON.parse(initialData.features) : initialData.features) : [""]
  );
  const [printResults, setPrintResults] = useState<string[]>(
    initialData?.print_results ? (typeof initialData.print_results === 'string' ? JSON.parse(initialData.print_results) : initialData.print_results) : [""]
  );

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    const formData = new FormData();
    formData.append("type", type);
    formData.append("name", name);
    formData.append("price", price);
    formData.append("description", description);
    formData.append("is_popular", isPopular.toString());
    formData.append("features", JSON.stringify(features.filter(f => f.trim() !== "")));
    if (type === "dokumentasi") formData.append("print_results", JSON.stringify(printResults.filter(p => p.trim() !== "")));
    if (imageFile) formData.append("image", imageFile);
    if (editingId) formData.append("id", editingId);

    const result = editingId ? await updatePackageAction(formData) : await createPackageAction(formData);

    if (result.success) onSuccess();
    else { setMessage({ type: "error", text: result.error || "Gagal menyimpan paket." }); setIsLoading(false); }
  };

  // ISI KONTEN MODAL KITA
  const modalContent = (
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 custom-scrollbar">
      <div className="flex min-h-full items-center justify-center p-4 md:p-8">
        <div className="bg-[#111] border border-white/10 w-full max-w-4xl rounded-3xl p-6 md:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
          
          <button onClick={onCancel} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-red-500 hover:text-white rounded-full text-white/40 transition-all z-10">
            <X className="w-5 h-5" />
          </button>
          
          <h3 className="text-xl font-bold text-white mb-8 flex items-center">
            <div className="w-2 h-8 bg-amber-500 rounded-full mr-4" />
            {editingId ? "Edit Detail Paket" : "Buat Paket Baru"}
          </h3>

          {message.text && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${message.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div>
                  <label className="block text-sm text-white/50 mb-3">Jenis Paket</label>
                  <div className="flex space-x-4">
                    <button type="button" onClick={() => setType("audio")} className={`flex-1 py-3 rounded-xl border transition-all ${type === 'audio' ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-white/5 border-white/5 text-white/40'}`}>Audio System</button>
                    <button type="button" onClick={() => setType("dokumentasi")} className={`flex-1 py-3 rounded-xl border transition-all ${type === 'dokumentasi' ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-white/5 border-white/5 text-white/40'}`}>Dokumentasi</button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/50 mb-2">Gambar Paket</label>
                  <div className="border-2 border-dashed border-white/10 hover:border-amber-500/50 transition-colors rounded-xl p-4 text-center">
                    {imagePreview ? (
                      <div className="relative h-40 rounded-lg overflow-hidden">
                        <img src={imagePreview} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => {setImageFile(null); setImagePreview(null);}} className="absolute top-2 right-2 bg-red-500 p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-lg">
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer py-8 flex flex-col items-center hover:opacity-70 transition-opacity">
                        <Upload className="w-8 h-8 text-white/20 mb-2" />
                        <span className="text-xs text-white/40">Klik untuk upload gambar</span>
                        <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if(file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
                        }} />
                      </label>
                    )}
                  </div>
                </div>

                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Paket" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-amber-500 transition-all" required />
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Harga (Contoh: 1500000)" className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-amber-500 transition-all" required />
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi singkat..." rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white outline-none focus:border-amber-500 transition-all resize-none" />
            </div>

            <div className="space-y-6 flex flex-col">
                <div className="flex-1">
                  <label className="text-sm text-white/50 block mb-2">Fitur & Layanan</label>
                  {features.map((f, i) => (
                    <div key={`feat-${i}`} className="flex mb-2 gap-2">
                      <input type="text" value={f} onChange={(e) => {const n=[...features]; n[i]=e.target.value; setFeatures(n);}} placeholder={`Fitur ${i + 1}`} className="flex-1 bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-all" />
                      <button type="button" onClick={() => setFeatures(features.filter((_, idx) => idx !== i))} className="p-2 bg-white/5 hover:bg-red-500/20 rounded-lg transition-colors"><X className="w-4 h-4 text-white/40 hover:text-red-400" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setFeatures([...features, ""])} className="text-xs text-amber-500 hover:text-amber-400 font-bold flex items-center mt-3 bg-amber-500/10 px-3 py-1.5 rounded-lg w-fit transition-colors">+ Tambah Fitur</button>
                </div>

                {type === "dokumentasi" && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-sm text-amber-500/70 block mb-2">Hasil Cetakan (Khusus Dokumentasi)</label>
                    {printResults.map((p, i) => (
                      <div key={`print-${i}`} className="flex mb-2 gap-2">
                        <input type="text" value={p} onChange={(e) => {const n=[...printResults]; n[i]=e.target.value; setPrintResults(n);}} placeholder={`Cetak ${i + 1}`} className="flex-1 bg-amber-500/[0.02] border border-amber-500/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-all" />
                        <button type="button" onClick={() => setPrintResults(printResults.filter((_, idx) => idx !== i))} className="p-2 bg-white/5 hover:bg-red-500/20 rounded-lg transition-colors"><X className="w-4 h-4 text-white/40 hover:text-red-400" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setPrintResults([...printResults, ""])} className="text-xs text-amber-500 hover:text-amber-400 font-bold flex items-center mt-3 bg-amber-500/10 px-3 py-1.5 rounded-lg w-fit transition-colors">+ Tambah Cetakan</button>
                  </div>
                )}

                <div className="pt-6 mt-4 border-t border-white/5">
                  <button type="submit" disabled={isLoading} className="w-full bg-amber-500 hover:bg-amber-400 py-4 rounded-xl font-bold text-black flex items-center justify-center transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> {editingId ? "Simpan Perubahan" : "Simpan Paket"}</>}
                  </button>
                </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // RETURN PORTAL (Me-lempar modal langsung ke tag <body>)
  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}