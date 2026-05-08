"use client";

import AdminBookingsTable from "../components/AdminBookingsTable";

export default function AdminBookingsPage() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6">
      <header className="mb-8 pb-6 border-b border-white/[0.05]">
        <h2 className="text-3xl font-light text-white tracking-tight">
          Manajemen <span className="font-bold">Pesanan</span>
        </h2>
        <p className="text-white/40 mt-2 text-sm">
          Kelola data pesanan, pembayaran, dan progres produksi dalam satu tabel.
        </p>
      </header>

      <AdminBookingsTable />
    </div>
  );
}
