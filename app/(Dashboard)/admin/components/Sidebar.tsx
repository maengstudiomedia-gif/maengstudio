"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Activity, CalendarDays, PackageSearch, Users, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { name: "Ringkasan", href: "/admin/dashboard", icon: <Activity className="w-5 h-5" /> },
  { name: "Manajemen Pesanan", href: "/admin/bookings", icon: <CalendarDays className="w-5 h-5" /> },
  { name: "Katalog Paket", href: "/admin/packages", icon: <PackageSearch className="w-5 h-5" /> },
  { name: "Data Calon Klien", href: "/admin/leads", icon: <Users className="w-5 h-5" /> },
] as const;

function isNavActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({
  adminName,
  initialPathname,
}: {
  adminName: string;
  initialPathname: string;
}) {
  const pathname = usePathname();
  const activePath = pathname || initialPathname;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <>
      <aside className="w-full md:w-72 bg-white/[0.02] border-r border-white/[0.05] backdrop-blur-xl p-6 flex-col justify-between hidden md:flex z-20">
        <div>
          <div className="mb-10">
            <h1 className="text-2xl font-light tracking-wide">
              MAENG <span className="font-bold text-rose-500">ADMIN</span>
            </h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
              Halo, {adminName || "Superuser"}
            </p>
          </div>

          <nav className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const isActive = isNavActive(activePath, item.href);

              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all mb-2 ${
                      isActive
                        ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        : "text-white/60 hover:bg-white/[0.05] hover:text-white border border-transparent"
                    }`}
                  >
                    <span className="opacity-80">{item.icon}</span>
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-white/50 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-sm group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-[#0a0a0a]/95 backdrop-blur-xl px-2 py-2 pb-safe">
        <ul className="flex items-center justify-between gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = isNavActive(activePath, item.href);

            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className="flex flex-col items-center justify-center gap-1 rounded-xl py-2"
                >
                  <span className={isActive ? "text-rose-400" : "text-white/45"}>{item.icon}</span>
                  <span
                    className={`text-[10px] leading-none ${
                      isActive ? "text-rose-400 font-semibold" : "text-white/45"
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              onClick={handleLogout}
              className="w-full flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-red-400/80"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-[10px] leading-none">Keluar</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
