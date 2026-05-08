// Lokasi file: app/(Dashboard)/admin/packages/page.tsx
"use client";

// Import komponen dengan path mundur dua folder (karena file ini ada di dalam folder 'packages')
import AdminPackages from "../components/AdminPackages"; 

export default function PackagesPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6">
      <header className="mb-8 pb-6 border-b border-white/[0.05]">
        <h2 className="text-3xl font-light text-white tracking-tight">
          Manajemen <span className="font-bold">Katalog Paket</span>
        </h2>
        <p className="text-white/40 mt-2 text-sm">
          Tambah, ubah, atau hapus paket layanan yang akan tampil otomatis di Dashboard Klien.
        </p>
      </header>
      
      {/* Memanggil Komponen Manajemen Paket */}
      <AdminPackages />
    </div>
  );
}