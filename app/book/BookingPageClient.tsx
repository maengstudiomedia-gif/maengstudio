"use client";

import { useEffect, useMemo, useState } from "react";
import { createPublicBookingAction } from "@/app/actions/booking";
import { Loader2, ArrowRight, CheckCircle2, Plus, Trash2 } from "lucide-react";

interface BookingPageClientProps {
  initialName: string;
  initialPhone: string;
  initialPackageId: string;
  packages: any[];
}

interface EventRow {
  id: string;
  date: string;
  address: string;
  eventName: string;
  startTime: string;
}

export default function BookingPageClient({ initialName, initialPhone, initialPackageId, packages }: BookingPageClientProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [selectedPackageId, setSelectedPackageId] = useState(initialPackageId);
  const [events, setEvents] = useState<EventRow[]>([
    { id: Date.now().toString(), date: "", address: "", eventName: "", startTime: "" }
  ]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setName(initialName);
    setPhone(initialPhone);
    setSelectedPackageId(initialPackageId);
  }, [initialName, initialPhone, initialPackageId]);

  const selectedPackage = useMemo(() => {
    return packages.find((pkg) => String(pkg.id) === String(selectedPackageId)) || packages[0] || null;
  }, [packages, selectedPackageId]);

  const totalPrice = selectedPackage ? Number(selectedPackage.price || 0) : 0;
  const dpAmount = totalPrice * 0.5;

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
  };

  const addEvent = () => {
    if (events.length >= 2) return;
    setEvents((prev) => [
      ...prev,
      { id: Date.now().toString(), date: "", address: "", eventName: "", startTime: "" }
    ]);
  };

  const removeEvent = (index: number) => {
    if (events.length <= 1) return;
    setEvents((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateEvent = (index: number, field: keyof EventRow, value: string) => {
    setEvents((prev) => prev.map((event, idx) => idx === index ? { ...event, [field]: value } : event));
  };

  const validateForm = () => {
    if (!name.trim()) {
      setMessage({ type: "error", text: "Nama klien wajib diisi." });
      return false;
    }
    if (!phone.trim()) {
      setMessage({ type: "error", text: "Nomor WhatsApp wajib diisi." });
      return false;
    }
    if (!selectedPackage) {
      setMessage({ type: "error", text: "Silakan pilih paket terlebih dahulu." });
      return false;
    }
    if (events.some((event) => !event.date || !event.eventName || !event.startTime || !event.address)) {
      setMessage({ type: "error", text: "Lengkapi semua detail acara sebelum melanjutkan." });
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!validateForm()) return;
    if (!selectedPackage) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        packageId: selectedPackage.id,
        events,
        notes: notes.trim() || null,
        totalPrice,
        dpAmount,
      };

      const result = await createPublicBookingAction(payload as any);
      if (result.success) {
        setMessage({ type: "success", text: result.message || "Booking publik berhasil dibuat." });
      } else {
        setMessage({ type: "error", text: result.message || "Gagal membuat booking publik." });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Terjadi kesalahan server. Silakan coba lagi." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white py-16 px-4 md:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-lg shadow-black/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-amber-300/80">Booking Publik</p>
              <h1 className="text-3xl md:text-4xl font-bold">Formulir Booking Langsung</h1>
              <p className="mt-2 text-white/60 max-w-2xl">
                Isi form ini untuk mengirimkan pesanan tanpa perlu login. Admin dapat terus memproses booking dari dashboard.
              </p>
            </div>
            <div className="text-right text-sm text-white/50">
              <p>Bayar DP 50% setelah konfirmasi.</p>
              <p>Hitung ulang biaya saat paket berubah.</p>
            </div>
          </div>
        </div>

        {message && (
          <div className={`rounded-3xl p-4 text-sm font-medium ${message.type === "success" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-rose-500/10 text-rose-300 border border-rose-500/20"}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Informasi Klien</h2>
                <p className="text-sm text-white/50 mt-1">Pastikan nama dan nomor WA terisi benar.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-white/70">
                  Nama Lengkap
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama klien"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-400"
                  />
                </label>
                <label className="space-y-2 text-sm text-white/70">
                  Nomor WhatsApp
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08..."
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-400"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Pilih Paket</h2>
                <p className="text-sm text-white/50 mt-1">Pilih paket agar harga dan detail acara terhitung otomatis.</p>
              </div>
              <div className="space-y-4">
                <select
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-400"
                >
                  <option value="">Pilih paket...</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={String(pkg.id)}>{pkg.name} — {formatRupiah(Number(pkg.price || 0))}</option>
                  ))}
                </select>

                {selectedPackage && (
                  <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
                    <p className="text-sm text-white/60">Paket terpilih:</p>
                    <p className="mt-2 text-lg font-semibold text-white">{selectedPackage.name}</p>
                    <p className="text-sm text-white/50 mt-2">{selectedPackage.description || "Tidak ada deskripsi paket."}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Detail Acara</h2>
                  <p className="text-sm text-white/50 mt-1">Isi minimal 1 acara. Tambahkan maksimal 2 acara jika perlu.</p>
                </div>
                <button
                  type="button"
                  onClick={addEvent}
                  disabled={events.length >= 2}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" /> Tambah Acara
                </button>
              </div>

              <div className="space-y-6">
                {events.map((eventRow, index) => (
                  <div key={eventRow.id} className="rounded-3xl border border-white/10 bg-black/10 p-4">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <p className="font-medium text-white">Acara {index + 1}</p>
                      {events.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEvent(index)}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      )}
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm text-white/70">
                        Tanggal Acara
                        <input
                          type="date"
                          value={eventRow.date}
                          onChange={(e) => updateEvent(index, "date", e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-400"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-white/70">
                        Jam Mulai
                        <input
                          type="time"
                          value={eventRow.startTime}
                          onChange={(e) => updateEvent(index, "startTime", e.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-400"
                        />
                      </label>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2 text-sm text-white/70">
                        Nama/Keterangan Acara
                        <input
                          value={eventRow.eventName}
                          onChange={(e) => updateEvent(index, "eventName", e.target.value)}
                          placeholder="Contoh: Foto Wedding"
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-400"
                        />
                      </label>
                      <label className="space-y-2 text-sm text-white/70">
                        Lokasi Acara
                        <input
                          value={eventRow.address}
                          onChange={(e) => updateEvent(index, "address", e.target.value)}
                          placeholder="Alamat acara"
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-400"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Catatan Tambahan</h2>
                <p className="text-sm text-white/50 mt-1">Bisa diisi request khusus, detail tambahan, atau informasi lainnya.</p>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Tuliskan catatan tambahan..."
                className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-white outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Ringkasan</h2>
                  <p className="text-sm text-white/50 mt-1">Harga paket dan total DP.</p>
                </div>
                <div className="rounded-3xl bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-300">Booking Publik</div>
              </div>
              <div className="space-y-3 text-sm text-white/70">
                <div className="flex items-center justify-between">
                  <span>Paket</span>
                  <span>{selectedPackage ? selectedPackage.name : "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Harga</span>
                  <span>{formatRupiah(totalPrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>DP minimum</span>
                  <span>{formatRupiah(dpAmount)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Metode Pembayaran</h2>
                <p className="text-sm text-white/50 mt-1">Gunakan metode transfer atau cash, lalu konfirmasi ke admin.</p>
              </div>
              <div className="rounded-3xl bg-white/5 border border-white/10 p-4 text-sm space-y-3">
                <p className="text-white/80">Transfer Bank / E-wallet</p>
                <p className="text-white/60 text-xs">BCA: 1234567890 a.n. Maeng Studio</p>
                <p className="text-white/60 text-xs">ShopeePay: 081234567890 (Maeng Studio)</p>
                <p className="text-white/60 text-xs">Gopay: 081234567890 (Maeng Studio)</p>
                <p className="text-white/60 text-xs">Kode unik transfer: gunakan 3 digit terakhir nomor HP Anda.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-3xl bg-amber-500 px-6 py-4 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  Kirim Booking
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </aside>
        </form>
      </div>
    </div>
  );
}
