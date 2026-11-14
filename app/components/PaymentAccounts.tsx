"use client";

import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { getPublicQrisAction } from "@/app/actions/qrisActions";

export default function PaymentAccounts({
  amount,
  theme = "light",
  paymentPlan,
  transferCode,
  showConfirmation = false,
}: {
  amount: number;
  theme?: "dark" | "light";
  paymentPlan?: "dp" | "full";
  transferCode?: number | null;
  showConfirmation?: boolean;
}) {
  const isDark = theme === "dark";
  const [qrisImageUrl, setQrisImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getPublicQrisAction()
      .then((result) => {
        if (!active) return;
        if (result.success) setQrisImageUrl(result.imageUrl ?? null);
        else setError(result.error || "QRIS gagal dimuat.");
      })
      .catch((loadError: unknown) => {
        console.error("Gagal memuat QRIS:", loadError);
        if (active) setError("QRIS gagal dimuat. Silakan coba beberapa saat lagi.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const fileExtension = qrisImageUrl?.split("?")[0].split(".").pop()?.toLowerCase() || "png";
  const downloadFileName = `QRIS-Maeng-Studio.${fileExtension}`;
  const textColor = isDark ? "text-white/75" : "text-[#52645a]";

  return (
    <div className="space-y-3">
      <p className={`text-xs font-semibold ${textColor}`}>Pembayaran QRIS</p>
      {isLoading ? (
        <div className={`flex items-center justify-center gap-2 rounded-xl border p-6 text-xs ${isDark ? "border-white/10 text-white/55" : "border-[#e8eee9] text-[#718078]"}`}>
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat QRIS...
        </div>
      ) : error ? (
        <p role="alert" className={`rounded-xl border p-3 text-xs ${isDark ? "border-red-400/20 bg-red-400/5 text-red-200" : "border-red-200 bg-red-50 text-red-700"}`}>
          {error}
        </p>
      ) : qrisImageUrl ? (
        <>
          <div className="rounded-xl border border-[#e8eee9] bg-white p-2">
            <img src={qrisImageUrl} alt="Kode pembayaran QRIS Maeng Studio" className="mx-auto max-h-72 w-full object-contain" />
          </div>
          <a
            href={`${qrisImageUrl}${qrisImageUrl.includes("?") ? "&" : "?"}download=${downloadFileName}`}
            download={downloadFileName}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              isDark ? "bg-amber-400 text-black hover:bg-amber-300" : "bg-[#087b45] text-white hover:bg-[#06683a]"
            }`}
          >
            <Download className="h-4 w-4" />
            Unduh QRIS
          </a>
          <div className={`border-t pt-3 ${isDark ? "border-white/10" : "border-[#edf1ee]"}`}>
            <p className={`text-xs ${isDark ? "text-white/55" : "text-[#718078]"}`}>Nominal yang harus dibayar</p>
            <p className={`mt-1 text-lg font-bold ${isDark ? "text-amber-300" : "text-[#087b45]"}`}>{formatRupiah(amount)}</p>
          </div>
          {transferCode && paymentPlan && (
            <p className={`text-[11px] leading-relaxed ${isDark ? "text-white/55" : "text-[#718078]"}`}>
              {paymentPlan === "full"
                ? `Kode unik ${String(transferCode).padStart(3, "0")} merupakan biaya administrasi QRIS.`
                : `Kode unik ${String(transferCode).padStart(3, "0")} digunakan sebagai pembeda dan memudahkan pengecekan. Pelunasan setelah DP tetap sebesar sisa harga paket.`}
            </p>
          )}
        </>
      ) : (
        <p className={`rounded-xl border p-3 text-xs ${isDark ? "border-white/10 text-white/55" : "border-[#e8eee9] text-[#718078]"}`}>
          QRIS belum tersedia. Silakan hubungi admin untuk metode pembayaran.
        </p>
      )}
      {showConfirmation && (
        <p className={`border-t pt-2 text-xs ${isDark ? "border-white/10 text-white/55" : "border-[#edf1ee] text-[#718078]"}`}>
          Setelah membayar, konfirmasi melalui WhatsApp.
        </p>
      )}
    </div>
  );
}
