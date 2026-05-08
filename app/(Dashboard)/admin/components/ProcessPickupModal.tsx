import { useState } from "react";
import { Loader2, Upload } from "lucide-react";
import type { BookingRow } from "./types";
import AlertModal from "./AlertModal";

type ProcessPickupProps = {
  target: BookingRow;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
};

export default function ProcessPickupModal({ target, onClose, onSave }: ProcessPickupProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  const handleSave = async () => {
    if (!file) {
      setAlertOpen(true);
      return;
    }
    setIsUploading(true);
    await onSave(file);
    setIsUploading(false);
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-white">Upload Bukti Pengambilan</h3>
        <p className="text-sm text-white/60">Nota: <span className="text-amber-400">{target.invoice_number}</span></p>
        
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white"
        />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white">Batal</button>
          <button onClick={handleSave} disabled={isUploading} className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center gap-2">
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Simpan
          </button>
        </div>
      </div>
      <AlertModal
        isOpen={alertOpen}
        title="File Belum Dipilih"
        message="Pilih foto bukti pengambilan terlebih dahulu sebelum menyimpan."
        variant="info"
        confirmLabel="Mengerti"
        onClose={() => setAlertOpen(false)}
      />
    </div>
  );
}