"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Mic2, 
  Search, 
  LogIn, 
  MapPin, 
  MessageCircle,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  Printer
} from "lucide-react";
import { getPublicPackages, getClientShowcase } from "@/app/actions/publicActions";
import PublicBookingCalendarSection from "@/app/components/bookingCalendar/PublicBookingCalendarSection";

// Fungsi Helper Format Rupiah
function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function LandingPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [pkgRes, clientRes] = await Promise.all([
        getPublicPackages(),
        getClientShowcase()
      ]);
      if (pkgRes.success) setPackages(pkgRes.data || []);
      if (clientRes.success) setClients(clientRes.data || []);
      setLoading(false);
    }
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-blue-500/30">
      
      {/* --- HEADER / NAVBAR --- */}
      <nav className="fixed top-0 w-full z-[100] bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <img src="/favicon.ico" alt="Maeng Studio" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tighter uppercase">Maeng Studio</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <a href="#kalender" className="hover:text-white transition-colors">Kalender</a>
            <a href="#layanan" className="hover:text-white transition-colors">Layanan</a>
            <a href="#klien" className="hover:text-white transition-colors">Klien</a>
            <a href="#kontak" className="hover:text-white transition-colors">Kontak</a>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/cek-nota" 
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-white/10 rounded-full hover:bg-white/5 transition-all"
            >
              <Search className="w-4 h-4" /> Cek Nota
            </Link>
            <Link 
              href="/login" 
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg shadow-blue-600/20 transition-all"
            >
              <LogIn className="w-4 h-4" /> Masuk
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-blue-400 text-xs font-bold uppercase tracking-widest">
            <Mic2 className="w-3 h-3" /> Profesional Audio & Dokumentasi
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1]">
            Abadikan Momen Berharga Dengan <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Kualitas Sempurna.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
            Solusi satu pintu untuk Dokumentasi Foto, Video, dan Sistem Audio Profesional di setiap acara spesial Anda.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/cek-nota" className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold rounded-2xl hover:scale-105 transition-transform flex items-center justify-center gap-2">
              Lacak Pesanan Saya <ChevronRight className="w-4 h-4" />
            </Link>
            <a href="https://wa.me/628117873878" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 font-bold rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-400" /> Konsultasi Gratis
            </a>
          </div>
        </div>
      </section>

      {/* --- KALENDER KETERSEDIAAN --- */}
      <section id="kalender" className="py-24 px-6 max-w-4xl mx-auto">
        <PublicBookingCalendarSection />
      </section>

      {/* --- SECTION PAKET LAYANAN --- */}
      <section id="layanan" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-bold">Paket Layanan Kami</h2>
            <p className="text-white/50">Pilih paket terbaik yang sesuai dengan kebutuhan acara Anda.</p>
          </div>
          <div className="h-px flex-1 bg-white/5 mx-8 hidden md:block" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => {
              // Set gambar default
              const fallbackImg = pkg.type === "Audio" 
                ? "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=800&auto=format&fit=crop" 
                : "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop"; 
                
              const displayImage = pkg.image_url || pkg.image || fallbackImg;

              // Parsing data JSON dengan aman
              let featuresList: string[] = [];
              let printsList: string[] = [];
              try { featuresList = typeof pkg.features === 'string' ? JSON.parse(pkg.features) : (pkg.features || []); } catch(e) {}
              try { printsList = typeof pkg.print_results === 'string' ? JSON.parse(pkg.print_results) : (pkg.print_results || []); } catch(e) {}

              return (
                <div key={pkg.id} className="group flex flex-col rounded-3xl bg-white/[0.02] border border-white/5 hover:border-blue-500/50 transition-all duration-500 overflow-hidden">
                  
                  {/* Container Gambar */}
                  <div className="relative h-56 w-full overflow-hidden bg-black shrink-0">
                    <img 
                      src={displayImage} 
                      alt={pkg.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1.5 bg-black/50 backdrop-blur-md text-blue-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-white/10 flex items-center gap-1.5">
                        {pkg.type === "Audio" ? <Mic2 className="w-3 h-3" /> : <img src="/favicon.ico" alt="Maeng Studio" className="w-3 h-3 object-contain" />}
                        {pkg.type}
                      </span>
                    </div>
                  </div>

                  {/* Konten Text */}
                  <div className="p-6 md:p-8 flex flex-col flex-1">
                    <h4 className="text-2xl font-bold mb-2">{pkg.name}</h4>
                    {pkg.description && (
                      <p className="text-white/40 text-sm mb-6">{pkg.description}</p>
                    )}
                    
                    {/* Daftar Fitur / Kru */}
                    <div className="flex-1">
                      {featuresList.length > 0 && (
                        <div className="mb-4 space-y-2">
                          <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-2">Termasuk:</p>
                          {featuresList.map((feature, idx) => (
                            <div key={`feat-${idx}`} className="flex items-start text-sm text-white/80">
                              <CheckCircle2 className="w-4 h-4 text-blue-400 mr-2.5 mt-0.5 shrink-0" />
                              <span className="leading-tight">{feature}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Daftar Hasil Cetakan */}
                      {printsList.length > 0 && (
                        <div className="pt-4 border-t border-white/5 space-y-2">
                          <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-2">Hasil Akhir/Cetak:</p>
                          {printsList.map((print, idx) => (
                            <div key={`print-${idx}`} className="flex items-start text-sm text-white/80">
                              <Printer className="w-4 h-4 text-emerald-400 mr-2.5 mt-0.5 shrink-0" />
                              <span className="leading-tight">{print}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Harga & Tombol Action */}
                    <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between shrink-0">
                      <div>
                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-tighter">Mulai Dari</p>
                        <p className="text-xl font-bold text-emerald-400">{formatRupiah(pkg.price)}</p>
                      </div>
                      <a 
                        href={`https://wa.me/628117873878?text=Halo Maeng Studio, saya tertarik dengan ${pkg.name} seharga ${formatRupiah(pkg.price)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 bg-white/5 rounded-xl group-hover:bg-blue-600 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-white" />
                      </a>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* --- SECTION KLIEN KAMI (SHOWCASE) --- */}
      <section id="klien" className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">Klien Terbahagia Kami</h2>
            <p className="text-white/50 max-w-xl mx-auto text-sm">Bukti nyata dedikasi kami dalam melayani setiap klien. Foto serah terima pesanan di Galeri Maeng Studio.</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {clients.map((client, idx) => (
                <div key={idx} className="relative group overflow-hidden rounded-2xl border border-white/10">
                  <img 
                    src={client.image} 
                    alt={`Klien ${client.name}`} 
                    className="w-full h-auto grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-tighter">{client.event}</p>
                    <p className="text-sm font-medium text-white">{client.name}</p>
                  </div>
                </div>
              ))}
              {clients.length === 0 && (
                <div className="col-span-full py-20 text-center text-white/20 flex flex-col items-center gap-2">
                  <ImageIcon className="w-12 h-12 opacity-10" />
                  <p>Belum ada foto klien yang diunggah.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* --- FOOTER & KONTAK --- */}
      <footer id="kontak" className="pt-24 pb-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black">M</div>
              <span className="text-lg font-bold tracking-tighter uppercase">Maeng Studio</span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed">
              Partner dokumentasi dan sistem tata suara terbaik di Palembang. Menghidupkan momen Anda melalui lensa dan gelombang suara yang jernih.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-blue-600 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-bold text-white uppercase tracking-widest text-xs">Hubungi Kami</h4>
            <div className="space-y-4">
              <a href="https://wa.me/628117873878" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                  <MessageCircle className="w-6 h-6 text-emerald-500 group-hover:text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">WhatsApp</p>
                  <p className="text-sm font-medium">0811 7873 878</p>
                </div>
              </a>
              <a href="https://share.google/le4lb3AN1gXf20OQQ" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                  <MapPin className="w-6 h-6 text-blue-500 group-hover:text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase font-black tracking-widest">Alamat Galeri</p>
                  <p className="text-sm font-medium">Klik untuk navigasi Maps</p>
                </div>
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-bold text-white uppercase tracking-widest text-xs">Tautan Cepat</h4>
            <ul className="space-y-3 text-sm text-white/40">
              <li><a href="#kalender" className="hover:text-blue-400 transition-colors">Kalender ketersediaan</a></li>
              <li><Link href="/cek-nota" className="hover:text-blue-400 transition-colors">Cek Status Pesanan</Link></li>
              <li><Link href="/login" className="hover:text-blue-400 transition-colors">Portal Admin</Link></li>
              <li><a href="#layanan" className="hover:text-blue-400 transition-colors">Paket Dokumentasi</a></li>
              <li><a href="#layanan" className="hover:text-blue-400 transition-colors">Audio System</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase font-bold tracking-widest text-white/20">
          <p>© 2026 Maeng Studio. All Rights Reserved.</p>
          <p>Built with ❤️ in Palembang</p>
        </div>
      </footer>

    </div>
  );
}