import { ExternalLink, MapPin } from "lucide-react";

const MAPS_LINK = "https://maps.app.goo.gl/wwS6s2UrogGZBYCG9";
const MAP_PREVIEW_URL = "https://maps.google.com/maps?q=-3.0130823%2C104.8208492&z=17&output=embed";
const STUDIO_ADDRESS = "Jl. Kapten Robani Kadir LRG Maeng No 06 RT 016 RW 004, Kel. Talangputri, Kec. Plaju.";

export default function PaymentLocation({ theme = "light" }: { theme?: "dark" | "light" }) {
  const isDark = theme === "dark";

  return (
    <div className={`overflow-hidden rounded-2xl border ${isDark ? "border-white/10 bg-white/[0.04]" : "border-[#e3ebe5] bg-white"}`}>
      <div className="relative aspect-[16/9] bg-[#e8f0ea]">
        <iframe
          title="Pratinjau lokasi Galeri Maeng Studio"
          src={MAP_PREVIEW_URL}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      <div className={`space-y-3 p-4 ${isDark ? "text-white/75" : "text-[#52645a]"}`}>
        <div className="flex items-start gap-2.5">
          <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${isDark ? "text-amber-300" : "text-[#087b45]"}`} />
          <div>
            <p className={`text-xs font-bold ${isDark ? "text-white" : "text-[#18271f]"}`}>Galeri Maeng Studio</p>
            <p className="mt-1 text-xs leading-relaxed">{STUDIO_ADDRESS}</p>
          </div>
        </div>
        <a
          href={MAPS_LINK}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold transition ${
            isDark ? "bg-amber-400 text-black hover:bg-amber-300" : "bg-[#087b45] text-white hover:bg-[#06683a]"
          }`}
        >
          <ExternalLink className="h-4 w-4" />
          Buka rute Google Maps
        </a>
      </div>
    </div>
  );
}
