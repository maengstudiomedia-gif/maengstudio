"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Users, 
  LogOut, 
  Settings, 
  Home, 
  FolderOpen, 
  Download, 
  CreditCard, 
  MessageSquare 
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

// Inisialisasi Supabase Client-side menggunakan @supabase/ssr (Rekomendasi Next.js App Router)
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Cek apakah user berada di rute admin
  const isAdmin = pathname.startsWith("/admin");

  // Definisi Menu Dinamis berdasarkan Role
  // Pastikan URL (href) ini sesuai dengan folder di dalam folder 'app' Anda
  const menuItems = isAdmin
    ? [
        { name: "Dashboard", href: "/admin", icon: Home },
        { name: "Kelola Akun", href: "/admin/accounts", icon: Users },
        { name: "Pengaturan", href: "/admin/settings", icon: Settings },
      ]
    : [
        { name: "Proyek Aktif", href: "/client/overview", icon: FolderOpen },
        { name: "File Deliverables", href: "/client/deliverables", icon: Download },
        { name: "Tagihan & Pembayaran", href: "/client/billing", icon: CreditCard },
        { name: "Permintaan Revisi", href: "/client/revision", icon: MessageSquare },
        { name: "Pengaturan Akun", href: "/client/settings", icon: Settings },
      ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row">
      
      {/* =========================================================
          DESKTOP SIDEBAR - Disembunyikan di Mobile
          ========================================================= */}
      <aside className="hidden md:flex flex-col w-72 fixed inset-y-0 left-0 bg-white/[0.02] border-r border-white/[0.05] backdrop-blur-xl z-20 justify-between">
        
        {/* Bagian Atas: Header & Navigasi */}
        <div>
          <div className="p-6 mb-4">
            <h1 className="text-2xl font-light tracking-wide">MAENG <span className="font-bold text-amber-500">STUDIO</span></h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
              {isAdmin ? "Admin Command Center" : "Client Command Center"}
            </p>
          </div>
          
          <nav className="px-4 space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                      : "text-white/60 hover:bg-white/[0.05] hover:text-white border border-transparent"
                  }`}
                >
                  <Icon className="w-5 h-5 opacity-80" />
                  <span className="font-medium text-sm">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bagian Bawah: Logout */}
        <div className="p-4 space-y-2">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Keluar Sesi Aman</span>
          </button>
        </div>
      </aside>

      {/* =========================================================
          MAIN CONTENT AREA
          ========================================================= */}
      {/* md:ml-72 karena lebar sidebar desktop adalah w-72 */}
      <main className="flex-1 md:ml-72 p-4 md:p-8 pb-24 md:pb-8 min-h-screen relative overflow-hidden">
        {/* Latar Belakang Glow Halus */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[300px] bg-amber-600/5 blur-[120px] pointer-events-none z-0"></div>
        
        <div className="relative z-10">
          {children}
        </div>
      </main>

      {/* =========================================================
          MOBILE BOTTOM NAVIGATION - Disembunyikan di Desktop
          ========================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/[0.05] z-50 px-2 py-3 pb-safe overflow-x-auto">
        <ul className="flex items-center justify-between min-w-max gap-4 px-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <Link href={item.href} className="flex flex-col items-center gap-1 p-2">
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? "text-amber-500" : "text-white/40"}`} />
                  <span className={`text-[9px] font-medium whitespace-nowrap ${isActive ? "text-amber-500" : "text-white/40"}`}>
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <button onClick={handleLogout} className="flex flex-col items-center gap-1 p-2">
              <LogOut className="w-5 h-5 text-red-400/70" />
              <span className="text-[9px] font-medium text-red-400/70 whitespace-nowrap">Keluar</span>
            </button>
          </li>
        </ul>
      </nav>

    </div>
  );
}