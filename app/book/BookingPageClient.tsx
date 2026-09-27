"use client";

import { useEffect, useMemo, useState } from "react";
import { createPublicBookingAction } from "@/app/actions/booking";
import { getPublicPackages } from "@/app/actions/publicActions";
import { PACKAGE_CATEGORIES, getPackageCategoryLabel } from "@/lib/package-categories";
import {
  Loader2,
  ArrowRight,
  CheckCircle2,
  Plus,
  Trash2,
  Printer,
  Package,
} from "lucide-react";

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

type CategoryFilter = "all" | string;

function parseStringList(value: unknown): string[] {
  try {
    if (typeof value === "string") return JSON.parse(value);
    if (Array.isArray(value)) return value.map(String);
  } catch {
    // ignore malformed JSON
  }
  return [];
}

export default function BookingPageClient({
  initialName,
  initialPhone,
  initialPackageId,
  packages: initialPackages,
}: BookingPageClientProps) {
  const [isPageReady, setIsPageReady] = useState(false);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [packages, setPackages] = useState<any[]>(initialPackages || []);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [selectedPackageId, setSelectedPackageId] = useState(initialPackageId);
  const [events, setEvents] = useState<EventRow[]>([
    { id: Date.now().toString(), date: "", address: "", eventName: "", startTime: "" },
  ]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setName(initialName);
    setPhone(initialPhone);
    setSelectedPackageId(initialPackageId);
    const timer = window.setTimeout(() => setIsPageReady(true), 180);
    return () => window.clearTimeout(timer);
  }, [initialName, initialPhone, initialPackageId]);

  useEffect(() => {
    let cancelled = false;

    async function refreshPackages() {
      setIsLoadingPackages(true);
      try {
        const result = await getPublicPackages();
        if (cancelled) return;
        if (result.success) {
          const nextPackages = result.data || [];
          setPackages(nextPackages);

          if (initialPackageId) {
            const matched = nextPackages.find((pkg: any) => String(pkg.id) === String(initialPackageId));
            if (matched) {
              setSelectedPackageId(String(matched.id));
              const category = String(matched.type || "").toLowerCase();
              if (PACKAGE_CATEGORIES.some((item) => item.value === category)) {
                setCategoryFilter(category);
              }
            }
          }
        }
      } catch (error) {
        console.error("Gagal memuat paket publik:", error);
      } finally {
        if (!cancelled) setIsLoadingPackages(false);
      }
    }

    refreshPackages();
    return () => {
      cancelled = true;
    };
  }, [initialPackageId]);

  const availableCategories = useMemo(() => {
    const present = new Set(
      packages.map((pkg) => String(pkg.type || "").toLowerCase()).filter(Boolean)
    );
    const known = PACKAGE_CATEGORIES.filter((category) => present.has(category.value));
    const hasOther = packages.some(
      (pkg) => !PACKAGE_CATEGORIES.some((category) => String(pkg.type || "").toLowerCase() === category.value)
    );
    return hasOther ? [...known, { value: "other", label: "Lainnya" }] : known;
  }, [packages]);

  const filteredPackages = useMemo(() => {
    if (categoryFilter === "all") return packages;
    if (categoryFilter === "other") {
      return packages.filter(
        (pkg) => !PACKAGE_CATEGORIES.some((category) => String(pkg.type || "").toLowerCase() === category.value)
      );
    }
    return packages.filter((pkg) => String(pkg.type || "").toLowerCase() === categoryFilter);
  }, [packages, categoryFilter]);

  const selectedPackage = useMemo(() => {
    return packages.find((pkg) => String(pkg.id) === String(selectedPackageId)) || null;
  }, [packages, selectedPackageId]);

  const totalPrice = selectedPackage ? Number(selectedPackage.price || 0) : 0;
  const dpAmount = totalPrice * 0.5;

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const addEvent = () => {
    if (events.length >= 2) return;
    setEvents((prev) => [
      ...prev,
      { id: Date.now().toString(), date: "", address: "", eventName: "", startTime: "" },
    ]);
  };

  const removeEvent = (index: number) => {
    if (events.length <= 1) return;
    setEvents((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateEvent = (index: number, field: keyof EventRow, value: string) => {
    setEvents((prev) => prev.map((event, idx) => (idx === index ? { ...event, [field]: value } : event)));
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
        setMessage({
          type: "success",
          text:
            result.message ||
            "Booking berhasil terkirim. Silakan melakukan pembayaran dan konfirmasi ke WA admin 08117873878.",
        });
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

  if (!isPageReady) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-10 shadow-lg shadow-black/20">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          <div className="text-center">
            <p className="text-lg font-semibold">Memuat form booking...</p>
            <p className="mt-1 text-sm text-white/60">Halaman sedang dipersiapkan, mohon tunggu sebentar.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white py-16 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
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
          <div
            className={`rounded-3xl p-4 text-sm font-medium ${
              message.type === "success"
                ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
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
                <p className="text-sm text-white/50 mt-1">
                  Paket diambil langsung dari katalog admin. Filter berdasarkan kategori lalu pilih kartu paket.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("all")}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    categoryFilter === "all"
                      ? "bg-amber-500 text-black"
                      : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  Semua
                </button>
                {availableCategories.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => setCategoryFilter(category.value)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      categoryFilter === category.value
                        ? "bg-amber-500 text-black"
                        : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              {isLoadingPackages ? (
                <div className="flex items-center justify-center gap-3 py-16 text-white/60">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                  Memuat paket terbaru dari database...
                </div>
              ) : filteredPackages.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center text-sm text-white/50">
                  Belum ada paket
                  {categoryFilter !== "all"
                    ? ` untuk kategori ${availableCategories.find((item) => item.value === categoryFilter)?.label || categoryFilter}`
                    : ""}
                  . Silakan hubungi admin atau pilih kategori lain.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPackages.map((pkg) => {
                    const isSelected = String(pkg.id) === String(selectedPackageId);
                    const featuresList = parseStringList(pkg.features);
                    const printsList = parseStringList(pkg.print_results);
                    const displayImage = pkg.image_url || pkg.image;

                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => setSelectedPackageId(String(pkg.id))}
                        className={`text-left rounded-3xl border p-5 transition-all ${
                          isSelected
                            ? "border-amber-500/60 bg-amber-500/[0.08] shadow-[0_0_30px_rgba(245,158,11,0.08)]"
                            : "border-white/10 bg-white/[0.02] hover:border-white/25"
                        }`}
                      >
                        <div className="relative mb-4 h-40 overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03]">
                          {displayImage ? (
                            <img src={displayImage} alt={pkg.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-white/20">
                              <Package className="h-10 w-10" />
                            </div>
                          )}
                          <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur-md">
                            {getPackageCategoryLabel(pkg.type)}
                          </span>
                          {isSelected && (
                            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
                              <CheckCircle2 className="h-3 w-3" /> Dipilih
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-semibold text-white">{pkg.name}</h3>
                        <p className="mt-2 text-xl font-bold text-amber-400">{formatRupiah(Number(pkg.price || 0))}</p>
                        <p className="mt-2 text-sm leading-relaxed text-white/55">
                          {pkg.description || "Tidak ada deskripsi paket."}
                        </p>

                        {featuresList.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Termasuk</p>
                            {featuresList.map((feature, idx) => (
                              <div key={`${pkg.id}-feat-${idx}`} className="flex items-start gap-2 text-sm text-white/75">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                <span className="leading-tight">{feature}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {printsList.length > 0 && (
                          <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">Hasil Cetak</p>
                            {printsList.map((printItem, idx) => (
                              <div key={`${pkg.id}-print-${idx}`} className="flex items-start gap-2 text-sm text-white/75">
                                <Printer className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                                <span className="leading-tight">{printItem}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
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

          <aside className="space-y-6 lg:sticky lg:top-8 self-start">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Ringkasan</h2>
                  <p className="text-sm text-white/50 mt-1">Harga paket dan total DP.</p>
                </div>
                <div className="rounded-3xl bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-300">
                  Booking Publik
                </div>
              </div>
              <div className="space-y-3 text-sm text-white/70">
                <div className="flex items-start justify-between gap-4">
                  <span>Paket</span>
                  <span className="text-right font-medium text-white">
                    {selectedPackage ? selectedPackage.name : "Belum dipilih"}
                  </span>
                </div>
                {selectedPackage && (
                  <div className="flex items-center justify-between">
                    <span>Kategori</span>
                    <span>{getPackageCategoryLabel(selectedPackage.type)}</span>
                  </div>
                )}
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
                <p className="text-sm text-white/50 mt-1">Transfer atau tunai di galeri. Semua atas nama Guntur Bayu Jantoro.</p>
              </div>
              <div className="rounded-3xl bg-white/5 border border-white/10 p-4 text-sm space-y-3">
                <p className="text-white/80 font-medium">Transfer Bank / E-wallet</p>
                <p className="text-white/60 text-xs">BCA: 8435901499 a.n. Guntur Bayu Jantoro</p>
                <p className="text-white/60 text-xs">SeaBank: 901760387739 a.n. Guntur Bayu Jantoro</p>
                <p className="text-white/60 text-xs">DANA: 081226216862 a.n. Guntur Bayu Jantoro</p>
                <p className="text-white/60 text-xs">Setelah transfer, konfirmasi WA agar admin segera memproses pesanan Anda.</p>
              </div>
              <div className="rounded-3xl bg-white/5 border border-white/10 p-4 text-sm space-y-3">
                <p className="text-white/80 font-medium">Tunai</p>
                <p className="text-white/60 text-xs">Bayar langsung di Galeri Maeng Studio.</p>
                <p className="text-white/60 text-xs">
                  Alamat: Jl. Kapten Robani Kadir LRG Maeng No 06 RT 016 RW 004 Kel. Talangputri, Kec. Plaju.
                </p>
                <a
                  href="https://maps.app.goo.gl/j1RSyaHJm1ucJDX19"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-300 hover:text-amber-200 text-sm"
                >
                  Buka arah Google Maps
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedPackage}
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
