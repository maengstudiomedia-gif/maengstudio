import { useState } from "react";
import { Loader2 } from "lucide-react";
import { parseEventDetails, makeEmptyEvent, openNativePicker } from "./utils";
import type { BookingRow, EventDetail } from "./types";

type EditModalProps = {
  initialData: BookingRow;
  onClose: () => void;
  onSave: (data: BookingRow) => Promise<void>;
};

export default function EditBookingModal({ initialData, onClose, onSave }: EditModalProps) {
  const [editing, setEditing] = useState<BookingRow>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditEventChange = (index: number, field: string, value: string) => {
    const list = parseEventDetails(editing.event_details);
    const next = [...list];
    next[index] = { ...next[index], [field]: value } as EventDetail;
    setEditing({ ...editing, event_details: next });
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    await onSave(editing);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#111] border border-white/10 rounded-3xl p-6 space-y-4 my-6">
        <h3 className="text-xl font-bold text-white">Edit Pesanan</h3>
        
        {/* Form Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            value={editing.client_name || ""}
            onChange={(e) => setEditing({ ...editing, client_name: e.target.value })}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white"
            placeholder="Nama Klien"
          />
          {/* Tambahkan input lainnya (client_phone, event_type, dll) seperti kode aslinya di sini... */}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white">
            Batal
          </button>
          <button onClick={handleSave} disabled={isSubmitting} className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}