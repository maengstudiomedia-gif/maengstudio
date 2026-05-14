import { useState, useEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import type { BookingRow } from "./types";

type PaymentModalProps = {
  target: BookingRow;
  defaultAmount: string;
  onClose: () => void;
  onSave: (amount: number) => Promise<void>;
};

export default function PaymentModal({ target, defaultAmount, onClose, onSave }: PaymentModalProps) {
  const [amount, setAmount] = useState(defaultAmount);
  const [isSaving, setIsSaving] = useState(false);
  
  // State khusus untuk menggantikan alert() dan window.confirm()
  const [errorMsg, setErrorMsg] = useState("");
  const [needsConfirm, setNeedsConfirm] = useState(false);

  useEffect(() => {
    setAmount(defaultAmount);
  }, [defaultAmount]);

  const totalHargaFormatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(target.invoice?.total_amount || 0));

  const handleSave = async () => {
    const nominal = Number(amount);
    if (!Number.isFinite(nominal) || nominal <= 0) {
      setErrorMsg("Nominal DP harus lebih dari Rp 0.");
      return;
    }

    const totalHarga = Number(target.invoice?.total_amount || 0);
    
    // Jika input lebih besar dari total harga, munculkan konfirmasi inline
    if (totalHarga > 0 && nominal > totalHarga && !needsConfirm) {
      setErrorMsg("Nominal DP yang diketik melebihi total harga pesanan!");
      setNeedsConfirm(true);
      return;
    }

    // Lolos validasi
    setErrorMsg("");
    setNeedsConfirm(false);
    setIsSaving(true);
    await onSave(nominal);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in duration-200">
        <h3 className="text-lg font-bold text-white">Input Pembayaran DP</h3>
        
        <div className="text-sm text-white/60 bg-white/5 p-3 rounded-xl border border-white/10">
          <p>Nota: <span className="text-amber-400 font-mono">{target.invoice_number || "-"}</span></p>
          <p>Total Harga: <span className="text-white font-medium">{totalHargaFormatted}</span></p>
        </div>
        
        <div className="space-y-2">
          <label className="text-xs text-white/50 block">Nominal DP (Bebas / Tanpa Batas)</label>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => {
                setAmount(e.target.value);
                // Reset peringatan setiap kali admin mengetik ulang angka
                setErrorMsg("");
                setNeedsConfirm(false);
            }}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 transition-colors"
            placeholder="Ketik nominal DP di sini..."
          />
        </div>

        {/* --- Peringatan Kustom Menggantikan Alert --- */}
        {errorMsg && (
            <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p>{errorMsg} {needsConfirm && <span className="block mt-1 font-bold">Klik "Tetap Simpan" jika Anda yakin.</span>}</p>
            </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors">
            Batal
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className={`px-5 py-2.5 rounded-xl text-black font-bold flex items-center gap-2 transition-colors ${needsConfirm ? "bg-red-500 hover:bg-red-400" : "bg-amber-500 hover:bg-amber-400"}`}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : needsConfirm ? "Tetap Simpan" : "Simpan DP"}
          </button>
        </div>
      </div>
    </div>
  );
}