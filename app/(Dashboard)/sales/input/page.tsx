"use client";

import { Suspense, useEffect, useState } from "react";
import { ClipboardList, Plus, ShoppingCart } from "lucide-react";
import { useSearchParams } from "next/navigation";
import LeadForm from "../../admin/components/LeadForm";
import AdminBookingForm from "../../admin/components/AdminBookingForm";
import { createLeadAction } from "@/app/actions/leadsActions";
import { getPackagesAction } from "@/app/actions/packages";
import { createBrowserClient } from "@supabase/ssr";

function SalesInputContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") === "booking" ? "booking" : "lead");
  const [leadOpen, setLeadOpen] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [bookingPackage, setBookingPackage] = useState<any>(null);
  const [userId, setUserId] = useState("");
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  useEffect(() => { getPackagesAction().then(setPackages); supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || "")); }, [supabase]);
  return <div className="space-y-8"><header><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Input center</p><h2 className="mt-3 text-3xl font-light text-white">Kelola input sales</h2></header><div className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2"><button onClick={() => setTab("lead")} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${tab === "lead" ? "bg-cyan-300 text-black" : "text-white/60"}`}><ClipboardList className="h-4 w-4" />Calon klien</button><button onClick={() => setTab("booking")} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${tab === "booking" ? "bg-cyan-300 text-black" : "text-white/60"}`}><ShoppingCart className="h-4 w-4" />Form pesanan</button></div>{tab === "lead" ? <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"><button onClick={() => setLeadOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 font-bold text-black"><Plus className="h-4 w-4" />Tambah calon klien</button>{leadOpen && <LeadForm onSave={async (payload) => { await createLeadAction(payload); setLeadOpen(false); }} onClose={() => setLeadOpen(false)} />}</section> : <section className="grid gap-4 md:grid-cols-2">{packages.map((pkg) => <button key={pkg.id} onClick={() => setBookingPackage(pkg)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition hover:border-amber-300/50"><p className="text-xs uppercase tracking-wider text-cyan-300">{pkg.type}</p><h3 className="mt-2 font-semibold text-white">{pkg.name}</h3><p className="mt-2 text-amber-300">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(pkg.price || 0)}</p></button>)}{bookingPackage && <AdminBookingForm userId={userId} selectedPackage={bookingPackage} allPackages={packages} onSuccess={() => setBookingPackage(null)} onCancel={() => setBookingPackage(null)} />}</section>}</div>;
}

export default function SalesInputPage() {
  return <Suspense fallback={<div className="min-h-[50vh]" />}><SalesInputContent /></Suspense>;
}