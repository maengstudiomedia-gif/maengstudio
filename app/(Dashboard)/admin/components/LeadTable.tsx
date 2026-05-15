"use client";

import { Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";

type LeadTableProps = {
  leads: any[];
  onEdit: (lead: any) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: "booked" | "cancelled") => void;
};

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

export default function LeadTable({ leads, onEdit, onDelete, onStatusChange }: LeadTableProps) {
  if (leads.length === 0) return <div className="py-16 text-center text-white/40">Belum ada data calon klien (Leads).</div>;

  return (
    <div className="overflow-x-auto">
      {/* Lebar tabel sedikit ditambah agar muat untuk kolom baru */}
      <table className="w-full min-w-[1300px] text-sm text-left">
        <thead className="text-white/40 uppercase text-[10px] tracking-wider border-b border-white/5">
          <tr>
            <th className="px-6 py-4">Nama & Kontak</th>
            <th className="px-6 py-4">Info Acara</th>
            <th className="px-6 py-4">Rencana Acara / Catatan</th>
            {/* Tambahan Kolom Baru */}
            <th className="px-6 py-4">Paket Diminati</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-center">Aksi / Follow Up</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const displayEventType = lead.event_type === "Lainnya" && lead.custom_event_type 
              ? lead.custom_event_type 
              : lead.event_type;

            // Mengambil relasi data paket (Bisa sesuaikan nama propertinya jika berbeda di backend, misal lead.package atau lead.packages)
            const packageData = lead.packages || lead.package;

            return (
              <tr key={lead.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                
                {/* Kolom 1: Nama & Kontak */}
                <td className="px-6 py-4 align-top">
                  <p className="text-white font-bold">{lead.client_name}</p>
                  <p className="text-xs text-amber-500">{lead.client_phone}</p>
                  <p className="text-[10px] text-white/40 mt-1">
                    Dibuat: {new Date(lead.created_at).toLocaleDateString("id-ID")}
                  </p>
                </td>

                {/* Kolom 2: Info Acara */}
                <td className="px-6 py-4 align-top">
                  {displayEventType || lead.event_date || lead.address ? (
                    <div className="flex flex-col gap-1 text-xs">
                      {displayEventType && (
                        <p className="text-emerald-400 font-medium">✨ {displayEventType}</p>
                      )}
                      {lead.event_date && (
                        <p className="text-white/80">📅 {new Date(lead.event_date).toLocaleDateString("id-ID", {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        })}</p>
                      )}
                      {lead.address && (
                        <p className="text-white/60">📍 {lead.address}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-white/40">-</span>
                  )}
                </td>

                {/* Kolom 3: Rencana & Catatan */}
                <td className="px-6 py-4 align-top">
                  {lead.event_plan && (
                    <div className="mb-2">
                      <p className="text-[10px] text-white/40 uppercase">Rencana:</p>
                      <p className="text-white/80 text-xs">{lead.event_plan}</p>
                    </div>
                  )}
                  {lead.notes && (
                    <div>
                      <p className="text-[10px] text-white/40 uppercase">Catatan:</p>
                      <p className="text-white/60 text-xs max-w-xs break-words" title={lead.notes}>
                        {lead.notes}
                      </p>
                    </div>
                  )}
                  {!lead.event_plan && !lead.notes && <span className="text-white/40">-</span>}
                </td>

                {/* Kolom 4: Paket Diminati */}
                <td className="px-6 py-4 align-top">
                  {packageData ? (
                    <div className="flex flex-col gap-1">
                      <p className="text-white text-xs font-bold">{packageData.name}</p>
                      <p className="text-amber-500 text-[11px] font-medium tracking-wide">
                        {packageData.price ? formatRupiah(packageData.price) : "Harga belum diatur"}
                      </p>
                    </div>
                  ) : (
                    <span className="text-white/40 text-xs italic">- Belum Pilih -</span>
                  )}
                </td>

                {/* Kolom 5: Status */}
                <td className="px-6 py-4 align-top">
                  <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    lead.status === "booked" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    lead.status === "cancelled" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                    "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}>
                    {lead.status}
                  </span>
                  {lead.status === "cancelled" && lead.cancel_reason && (
                    <p className="text-[10px] text-red-400/70 mt-2 truncate max-w-[150px]" title={lead.cancel_reason}>
                      Alasan: {lead.cancel_reason}
                    </p>
                  )}
                </td>

                {/* Kolom 6: Aksi */}
                <td className="px-6 py-4 align-top">
                  <div className="flex items-center justify-center gap-2">
                    {lead.status === "pending" && (
                      <>
                        <button onClick={() => onStatusChange(lead.id, "booked")} title="Sukses Booking" className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => onStatusChange(lead.id, "cancelled")} title="Batal Booking" className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button onClick={() => onEdit(lead)} title="Edit" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDelete(lead.id)} title="Hapus Permanen" className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}