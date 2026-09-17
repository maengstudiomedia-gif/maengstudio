"use client";

import { useMemo, useState } from "react";
import { Download, ImageIcon, Loader2, Sparkles, X } from "lucide-react";
import { getPackageCategoryLabel } from "@/lib/package-categories";

interface PackagePosterModalProps {
  pkg: Record<string, unknown>;
  onClose: () => void;
}

const paletteByCategory: Record<string, { accent: string; soft: string }> = {
  audio: { accent: "#8fd3ff", soft: "#183247" },
  dokumentasi: { accent: "#f7c873", soft: "#3d2a15" },
  dekorasi: { accent: "#f2a7b8", soft: "#3b202b" },
  catering: { accent: "#a9d7a1", soft: "#1f3525" },
  bundle: { accent: "#d3b0ff", soft: "#2e2242" },
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatFieldName(field: string): string {
  return field.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[character] || character);
}

function buildPosterSvg(pkg: Record<string, unknown>, fields: [string, unknown][], accent: string, soft: string) {
  const name = escapeXml(formatValue(pkg.name));
  const category = escapeXml(getPackageCategoryLabel(pkg.type));
  const imageUrl = typeof pkg.image_url === "string" ? escapeXml(pkg.image_url) : "";
  const price = typeof pkg.price === "number"
    ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(pkg.price)
    : formatValue(pkg.price);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1080" viewBox="0 0 1080 1080">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#101318"/><stop offset="1" stop-color="${soft}"/></linearGradient></defs>
    <rect width="1080" height="1080" fill="url(#bg)"/><circle cx="950" cy="80" r="210" fill="${accent}" opacity=".12"/>
    ${imageUrl ? `<image href="${imageUrl}" x="70" y="70" width="940" height="510" preserveAspectRatio="xMidYMid slice"/><rect x="70" y="70" width="940" height="510" fill="#000" opacity=".2"/>` : "<rect x=\"70\" y=\"70\" width=\"940\" height=\"510\" rx=\"24\" fill=\"#20252c\"/>"}
    <text x="90" y="635" fill="${accent}" font-size="24" font-weight="700" letter-spacing="3">${category.toUpperCase()}</text>
    <text x="90" y="710" fill="#fff" font-size="62" font-weight="800">${name.slice(0, 28)}</text>
    <text x="90" y="780" fill="${accent}" font-size="38" font-weight="700">${escapeXml(price)}</text>
    <text x="90" y="845" fill="#e6e0d6" font-size="24">${escapeXml(formatValue(pkg.description).slice(0, 62))}</text>
    <line x1="90" y1="895" x2="990" y2="895" stroke="${accent}" opacity=".45"/>
    <text x="90" y="960" fill="#fff" font-size="24" font-weight="700">DETAIL PAKET</text>
  </svg>`;
}

export default function PackagePosterModal({ pkg, onClose }: PackagePosterModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const category = String(pkg.type || "").toLowerCase();
  const palette = paletteByCategory[category] || { accent: "#f7c873", soft: "#3d2a15" };
  const fields = useMemo(() => Object.entries(pkg), [pkg]);
  const posterSvg = useMemo(() => buildPosterSvg(pkg, fields, palette.accent, palette.soft), [fields, palette.accent, palette.soft, pkg]);
  const posterUrl = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(posterSvg)}`, [posterSvg]);

  const downloadPoster = () => {
    setIsDownloading(true);
    const link = document.createElement("a");
    link.href = posterUrl;
    link.download = `${String(pkg.name || "paket").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-poster.svg`;
    link.click();
    window.setTimeout(() => setIsDownloading(false), 500);
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Poster paket">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111419] shadow-2xl lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-8">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-400"><Sparkles className="h-4 w-4" /> Smart poster 1:1</div>
              <h3 className="text-xl font-bold text-white">Poster siap dibagikan</h3>
              <p className="mt-1 text-sm text-white/45">Komposisi otomatis mengikuti kategori dan isi paket.</p>
            </div>
            <button onClick={onClose} aria-label="Tutup" className="rounded-xl p-2 text-white/50 transition hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-[#080a0d] p-3 sm:p-5">
            <img src={posterUrl} alt={`Poster ${String(pkg.name || "paket")}`} className="mx-auto aspect-square w-full max-w-[620px] object-contain shadow-2xl" />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={downloadPoster} disabled={isDownloading} className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-amber-300 disabled:opacity-60">
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Unduh poster SVG
            </button>
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs text-white/50"><ImageIcon className="h-4 w-4" /> 1080 x 1080 px</span>
          </div>
        </div>
        <aside className="w-full overflow-auto border-t border-white/10 bg-white/[0.03] p-5 lg:w-[360px] lg:border-l lg:border-t-0 lg:p-7">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-white/35">Database fields</p>
          <p className="mb-5 text-sm text-white/55">Semua field dari baris paket ditampilkan di sini.</p>
          <div className="space-y-3">
            {fields.map(([field, value]) => (
              <div key={field} className="border-b border-white/[0.07] pb-3">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-amber-400/75">{formatFieldName(field)}</dt>
                <dd className="mt-1 break-words text-xs leading-relaxed text-white/75">{formatValue(value)}</dd>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}