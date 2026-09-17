"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LogOut, TrendingUp } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

export default function SalesSidebar({ salesName }: { salesName: string }) {
  const pathname = usePathname();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const items = [{ href: "/sales", label: "Dashboard Sales", icon: TrendingUp }, { href: "/sales/input", label: "Input Data", icon: ClipboardList }];
  const logout = async () => { await supabase.auth.signOut(); window.location.href = "/login"; };
  return <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0c1114]/95 p-2 backdrop-blur-xl md:static md:flex md:w-72 md:flex-col md:border-r md:border-t-0 md:p-6"><div className="hidden md:block md:flex-1"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Maeng Studio</p><h1 className="mt-3 text-2xl font-light text-white">Sales <span className="font-bold text-cyan-300">Portal</span></h1><p className="mt-2 text-xs text-white/45">Halo, {salesName}</p><nav className="mt-12 space-y-2">{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${pathname === href ? "bg-cyan-300/10 text-cyan-200" : "text-white/55 hover:bg-white/5 hover:text-white"}`}><Icon className="h-5 w-5" />{label}</Link>)}</nav></div><div className="flex items-center justify-around md:block"><div className="flex gap-2 md:hidden">{items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={`flex flex-col items-center gap-1 px-4 py-2 text-[10px] ${pathname === href ? "text-cyan-200" : "text-white/45"}`}><Icon className="h-5 w-5" />{label}</Link>)}</div><button onClick={logout} className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-white/50 hover:bg-red-500/10 hover:text-red-300"><LogOut className="h-5 w-5" /> <span className="hidden md:inline">Keluar</span></button></div></aside>;
}