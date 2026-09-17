"use client";

import { useEffect, useState } from "react";
import { Banknote, CalendarDays, Loader2, Target, Users } from "lucide-react";
import Link from "next/link";
import { getSalesDashboardAction } from "@/app/actions/salesActions";

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);

export default function SalesPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => { getSalesDashboardAction().then((result) => result.success ? setData(result.data) : setError(result.error || "Gagal memuat data.")); }, []);
  if (error) return <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-200">{error}</div>;
  if (!data) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-300" /></div>;
  const cards = [{ label: `Revenue ${data.monthLabel}`, value: rupiah(data.revenue), icon: Banknote, accent: "text-cyan-300" }, { label: "Calon klien sukses booking", value: data.bookedLeads, icon: Users, accent: "text-emerald-300" }, { label: "Incentive bulan ini (2%)", value: rupiah(data.incentive), icon: Target, accent: "text-amber-300" }, { label: `Incentive ${data.previousMonthLabel}`, value: rupiah(data.previousIncentive), icon: CalendarDays, accent: "text-violet-300" }];
  return <div className="space-y-8"><header><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Sales performance</p><h2 className="mt-3 text-3xl font-light text-white">Selamat datang, <span className="font-semibold">{data.name || "Sales"}</span></h2><p className="mt-2 text-sm text-white/45">Periode dihitung dari tanggal 1 sampai akhir bulan kalender.</p></header><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, accent }) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><Icon className={`h-5 w-5 ${accent}`} /><p className="mt-7 text-xs text-white/45">{label}</p><p className="mt-2 text-xl font-bold text-white">{value}</p></div>)}</div><section className="grid gap-5 md:grid-cols-2"><Link href="/sales/input" className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-7 transition hover:bg-cyan-300/10"><Users className="h-7 w-7 text-cyan-300" /><h3 className="mt-8 text-xl font-semibold text-white">Input calon klien</h3><p className="mt-2 text-sm text-white/50">Catat prospek baru dan pantau status booking.</p></Link><Link href="/sales/input?tab=booking" className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-7 transition hover:bg-amber-300/10"><Banknote className="h-7 w-7 text-amber-300" /><h3 className="mt-8 text-xl font-semibold text-white">Buat pesanan</h3><p className="mt-2 text-sm text-white/50">Masukkan form pesanan klien baru ke sistem admin.</p></Link></section></div>;
}