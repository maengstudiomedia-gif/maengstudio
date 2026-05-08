// file: app/(Dashboard)/admin/components/PackageCard.tsx

// 1. Pastikan import Plus ada di sini
import { CheckCircle2, Trash2, Edit, Package, Plus } from "lucide-react";

interface PackageProps {
  pkg: any;
  onEdit: () => void;
  onDelete: () => void;
  onBooking: () => void; // Definisi props onBooking
}

// 2. PASTIKAN onBooking ditambahkan di dalam kurung kurawal parameter ini:
export default function PackageCard({ pkg, onEdit, onDelete, onBooking }: PackageProps) {
  
  // Parsing JSON fitur & cetakan
  const featuresList = typeof pkg.features === 'string' ? JSON.parse(pkg.features) : (pkg.features || []);
  const printsList = typeof pkg.print_results === 'string' ? JSON.parse(pkg.print_results) : (pkg.print_results || []);
  
  const isAudio = pkg.type === "audio";

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 group hover:border-amber-500/30 transition-all flex flex-col h-full relative overflow-hidden">
      {/* Badge Type */}
      <div className={`absolute top-4 left-4 z-10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${isAudio ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
        {isAudio ? 'Audio' : 'Dokumentasi'}
      </div>

      {/* Image Preview */}
      <div className="w-full h-44 rounded-xl overflow-hidden mb-5 bg-white/5 border border-white/5">
        {pkg.image_url ? (
          <img src={pkg.image_url} alt={pkg.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/[0.02]">
            <Package className="w-10 h-10 text-white/10" />
          </div>
        )}
      </div>

      <h4 className="text-lg font-bold text-white mb-1 group-hover:text-amber-500 transition-colors">{pkg.name}</h4>
      <p className="text-amber-500 font-black text-xl mb-4">
        {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(pkg.price)}
      </p>

      {/* Area Detail (Fitur & Cetakan) dengan flex-1 agar tombol aksi terdorong ke bawah */}
      <div className="flex-1 flex flex-col mb-6">
        {/* List Fitur */}
        <div className="space-y-2">
          {featuresList.slice(0, 3).map((f: string, i: number) => (
            <div key={`feat-${i}`} className="flex items-start text-xs text-white/40">
              <CheckCircle2 className="w-3 h-3 text-amber-500 mr-2 mt-0.5 shrink-0" />
              <span className="line-clamp-1">{f}</span>
            </div>
          ))}
          {featuresList.length > 3 && (
            <p className="text-[10px] text-white/20 italic mt-2">+ {featuresList.length - 3} fitur lainnya</p>
          )}
        </div>

        {/* List Hasil Cetakan (Hanya untuk Dokumentasi) */}
        {!isAudio && printsList.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/[0.05]">
            <p className="text-[10px] text-amber-500/70 mb-2 font-medium uppercase tracking-wider">Hasil Cetak:</p>
            <div className="space-y-1.5">
              {printsList.slice(0, 2).map((p: string, i: number) => (
                <div key={`print-${i}`} className="flex items-start text-xs text-white/50">
                  <span className="w-1 h-1 bg-amber-500/50 rounded-full mr-2 mt-1.5 shrink-0" />
                  <span className="line-clamp-1">{p}</span>
                </div>
              ))}
              {printsList.length > 2 && (
                <p className="text-[10px] text-white/20 italic mt-1">+ {printsList.length - 2} cetakan lainnya</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t border-white/5 mt-auto">
        {/* Tombol Buat Pesanan Baru */}
        <button 
          onClick={onBooking}
          className="flex-1 flex items-center justify-center py-2.5 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-black rounded-xl text-xs font-bold transition-all"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Pesanan
        </button>
        
        <button 
          onClick={onEdit}
          className="p-2.5 flex items-center justify-center bg-white/5 hover:bg-blue-500 hover:text-white rounded-xl text-white/50 text-xs font-bold transition-all"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button 
          onClick={onDelete}
          className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}