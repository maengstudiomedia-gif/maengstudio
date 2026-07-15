import { useEffect, useState } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { generateInvoiceNumberAction } from "@/app/actions/adminBookings";
import { parseEventDetails, makeEmptyEvent } from "./utils";
import type { BookingRow, EventDetail } from "./types";

type EditModalProps = {
  initialData: BookingRow;
  onClose: () => void;
  onSave: (data: BookingRow) => Promise<void>;
};

export default function EditBookingModal({ initialData, onClose, onSave }: EditModalProps) {
  const [editing, setEditing] = useState<BookingRow>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  useEffect(() => {
    setEditing(initialData);
  }, [initialData]);

  const handleEditEventChange = (index: number, field: string, value: string) => {
    const list = parseEventDetails(editing.event_details);
    const next = [...list];
    next[index] = { ...next[index], [field]: value } as EventDetail;
    setEditing({ ...editing, event_details: next });
  };

  const handleAddEvent = () => {
    const list = parseEventDetails(editing.event_details);
    setEditing({ ...editing, event_details: [...list, makeEmptyEvent()] });
  };

  const handleRemoveEvent = (index: number) => {
    const list = parseEventDetails(editing.event_details).filter((_, itemIndex) => itemIndex !== index);
    setEditing({ ...editing, event_details: list });
  };

  const handleGenerateInvoice = async () => {
    setIsGeneratingInvoice(true);
    try {
      const generated = await generateInvoiceNumberAction();
      setEditing({ ...editing, invoice_number: generated || "" });
    } catch {
      setEditing({ ...editing, invoice_number: "" });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    await onSave(editing);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#111] border border-white/10 rounded-3xl p-6 space-y-5 my-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-white">Edit Pesanan</h3>
            <p className="text-sm text-white/50 mt-1">Ubah semua data pesanan yang tersedia, termasuk nomor nota.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] uppercase tracking-widest text-white/40">Nomor Nota</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={editing.invoice_number || ""}
                onChange={(e) => setEditing({ ...editing, invoice_number: e.target.value })}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500"
                placeholder="Contoh: M16A07E2026N001G"
              />
              <button
                type="button"
                onClick={handleGenerateInvoice}
                disabled={isGeneratingInvoice}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-amber-400 hover:bg-amber-500/20 disabled:opacity-70"
              >
                {isGeneratingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate
              </button>
            </div>
          </div>

          <input
            value={editing.client_name || ""}
            onChange={(e) => setEditing({ ...editing, client_name: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500"
            placeholder="Nama Klien"
          />
          <input
            value={editing.client_phone || ""}
            onChange={(e) => setEditing({ ...editing, client_phone: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500"
            placeholder="Nomor WA"
          />
          <input
            value={editing.service_type || ""}
            onChange={(e) => setEditing({ ...editing, service_type: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500"
            placeholder="Tipe layanan"
          />
          <select
            value={editing.event_type || "Pernikahan"}
            onChange={(e) => setEditing({ ...editing, event_type: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500"
          >
            <option value="Pernikahan">Pernikahan</option>
            <option value="Khitan">Khitan</option>
            <option value="Aqiqah">Aqiqah</option>
            <option value="Ulang Tahun">Ulang Tahun</option>
            <option value="Lainnya">Lainnya</option>
          </select>
          <input
            value={editing.custom_event_type || ""}
            onChange={(e) => setEditing({ ...editing, custom_event_type: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500"
            placeholder="Jenis acara lain"
          />
          <select
            value={editing.booker_type || "sendiri"}
            onChange={(e) => setEditing({ ...editing, booker_type: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500"
          >
            <option value="sendiri">Memesan untuk sendiri</option>
            <option value="orang_lain">Memesan untuk orang lain</option>
          </select>
          <input
            value={editing.bride_name || ""}
            onChange={(e) => setEditing({ ...editing, bride_name: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500"
            placeholder="Nama pengantin wanita"
          />
          <input
            value={editing.groom_name || ""}
            onChange={(e) => setEditing({ ...editing, groom_name: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500"
            placeholder="Nama pengantin pria"
          />
          <select
            value={editing.status || "pending_payment"}
            onChange={(e) => setEditing({ ...editing, status: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500"
          >
            <option value="pending_payment">Pending Payment</option>
            <option value="locked">Locked</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Detil Acara</h4>
            <button
              type="button"
              onClick={handleAddEvent}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 px-3 py-2 text-sm text-amber-400"
            >
              <Plus className="w-4 h-4" /> Tambah Acara
            </button>
          </div>

          {parseEventDetails(editing.event_details).map((event, index) => (
            <div key={`${event.date || index}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Acara {index + 1}</p>
                <button
                  type="button"
                  onClick={() => handleRemoveEvent(index)}
                  className="rounded-full p-2 text-white/40 hover:bg-white/10 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="date"
                  value={event.date || ""}
                  onChange={(e) => handleEditEventChange(index, "date", e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500"
                />
                <input
                  type="time"
                  value={event.time || ""}
                  onChange={(e) => handleEditEventChange(index, "time", e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500"
                />
                <input
                  value={event.title || ""}
                  onChange={(e) => handleEditEventChange(index, "title", e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 md:col-span-2"
                  placeholder="Keterangan acara"
                />
                <input
                  value={event.address || ""}
                  onChange={(e) => handleEditEventChange(index, "address", e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 md:col-span-2"
                  placeholder="Alamat"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white">
            Batal
          </button>
          <button onClick={handleSave} disabled={isSubmitting} className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:opacity-70">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}