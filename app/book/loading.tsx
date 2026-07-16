import { Loader2 } from "lucide-react";

export default function BookLoading() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-10 shadow-lg shadow-black/20">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
        <div className="text-center">
          <p className="text-lg font-semibold">Memuat form booking...</p>
          <p className="mt-1 text-sm text-white/60">Mohon tunggu sebentar, halaman sedang disiapkan.</p>
        </div>
      </div>
    </div>
  );
}
