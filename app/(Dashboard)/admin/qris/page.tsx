"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ImagePlus, Loader2, QrCode, Upload } from "lucide-react";
import { getPublicQrisAction, uploadQrisImageAction } from "@/app/actions/qrisActions";

export default function QrisSettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    getPublicQrisAction()
      .then((result) => {
        if (!active) return;
        if (result.success) setImageUrl(result.imageUrl ?? null);
        else setError(result.error || "Gagal memuat gambar QRIS.");
      })
      .catch((loadError: unknown) => {
        console.error("Gagal memuat pengaturan QRIS:", loadError);
        if (active) setError("Gagal memuat gambar QRIS.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");
    setIsUploading(true);
    const formData = new FormData();
    formData.set("qrisImage", file);

    try {
      const result = await uploadQrisImageAction(formData);
      if (result.success) {
        setImageUrl(result.imageUrl ?? null);
        setSuccess("Gambar QRIS berhasil diperbarui dan akan tampil di halaman pembayaran customer.");
      } else {
        setError(result.error || "Gambar QRIS gagal diunggah.");
      }
    } catch (uploadError: unknown) {
      console.error("Gagal mengunggah gambar QRIS:", uploadError);
      setError("Gagal mengunggah gambar QRIS. Silakan coba lagi.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <header className="border-b border-white/[0.05] pb-6">
        <div className="flex items-center gap-3 text-rose-400">
          <QrCode className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Pengaturan pembayaran</span>
        </div>
        <h2 className="mt-3 text-3xl font-light text-white">Gambar QRIS</h2>
        <p className="mt-2 text-sm text-white/45">Unggah satu QRIS untuk digunakan pada semua halaman pembayaran customer.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
      {success && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4 shrink-0" />{success}</p>}

      <section className="max-w-xl space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
        <div>
          <h3 className="text-sm font-semibold text-white">QRIS aktif</h3>
          <p className="mt-1 text-xs leading-relaxed text-white/45">Format JPG, PNG, atau WebP. Ukuran maksimal 5 MB. Gambar sebelumnya akan diganti.</p>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-white/10 bg-black/20 text-white/50">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : imageUrl ? (
          <div className="rounded-xl bg-white p-3">
            <img src={imageUrl} alt="QRIS aktif Maeng Studio" className="mx-auto max-h-96 w-full object-contain" />
          </div>
        ) : (
          <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 bg-black/20 text-white/40">
            <ImagePlus className="h-8 w-8" />
            <span className="text-sm">Belum ada gambar QRIS</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          className="hidden"
          disabled={isUploading}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || isUploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {isUploading ? "Mengunggah..." : imageUrl ? "Ganti gambar QRIS" : "Tambah gambar QRIS"}
        </button>
      </section>
    </div>
  );
}
