"use client";

import { useEffect, useState } from "react";
import { Banknote, CalendarDays, Loader2, Target, Users } from "lucide-react";
import Link from "next/link";
import { getSalesDashboardAction } from "@/app/actions/salesActions";
import { getSalesBookingsAction } from "@/app/actions/salesActions";
import { getLeadsAction, createLeadAction, updateLeadAction, updateLeadStatusAction, deleteLeadAction } from "@/app/actions/leadsActions";
import LeadTable from "../admin/components/LeadTable";
import LeadForm from "../admin/components/LeadForm";

const rupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0);

export default function SalesPage() {
  const [data, setData] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [monthOffset, setMonthOffset] = useState(0);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [duplicateLead, setDuplicateLead] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getSalesDashboardAction().then((result) => result.success ? setData(result.data) : setError(result.error || "Gagal memuat data."));
  }, []);
  useEffect(() => {
    Promise.all([getLeadsAction(monthOffset), getSalesBookingsAction(monthOffset)]).then(([leadResult, bookingResult]) => {
      if (leadResult.success) setLeads(leadResult.data || []);
      else setError(leadResult.error || "Gagal memuat calon klien.");
      if (bookingResult.success) setBookings(bookingResult.data || []);
      else setError(bookingResult.error || "Gagal memuat pesanan.");
    });
  }, [monthOffset]);
  if (error) return <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-200">{error}</div>;
  if (!data) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-300" /></div>;
  const cards = [{ label: `Revenue ${data.monthLabel}`, value: rupiah(data.revenue), icon: Banknote, accent: "text-cyan-300" }, { label: "Calon klien sukses booking", value: data.bookedLeads, icon: Users, accent: "text-emerald-300" }, { label: "Incentive bulan ini (2%)", value: rupiah(data.incentive), icon: Target, accent: "text-amber-300" }, { label: `Incentive ${data.previousMonthLabel}`, value: rupiah(data.previousIncentive), icon: CalendarDays, accent: "text-violet-300" }];
  const periodLabel = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const refreshLeads = async () => {
    const result = await getLeadsAction(monthOffset);
    if (result.success) setLeads(result.data || []);
  };
  const saveLead = async (payload: any) => {
    const result = editingLead ? await updateLeadAction(editingLead.id, payload) : await createLeadAction(payload);
    if (!result.success) {
      setDuplicateLead({ ...(result.duplicate || {}), error: result.error || "Gagal menyimpan calon klien." });
      setShowLeadForm(false);
      setEditingLead(null);
      return;
    }
    setShowLeadForm(false);
    setEditingLead(null);
    setDuplicateLead(null);
    refreshLeads();
  };
  const updateStatus = async (id: string, status: "booked" | "cancelled") => {
    const result = await updateLeadStatusAction(id, status);
    if (!result.success) setError(result.error || "Gagal mengubah follow-up.");
    else refreshLeads();
  };
  const deleteLead = async (id: string) => {
    if (!confirm("Hapus calon klien ini?")) return;
    const result = await deleteLeadAction(id);
    if (!result.success) setError(result.error || "Gagal menghapus calon klien.");
    else refreshLeads();
  };
  return <div className="space-y-8"><header><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Sales performance</p><h2 className="mt-3 text-3xl font-light text-white">Selamat datang, <span className="font-semibold">{data.name || "Sales"}</span></h2><p className="mt-2 text-sm text-white/45">Data yang tampil hanya input milik Anda.</p></header><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, accent }) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><Icon className={`h-5 w-5 ${accent}`} /><p className="mt-7 text-xs text-white/45">{label}</p><p className="mt-2 text-xl font-bold text-white">{value}</p></div>)}</div><section className="grid gap-5 md:grid-cols-2"><Link href="/sales/input" className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-7 transition hover:bg-cyan-300/10"><Users className="h-7 w-7 text-cyan-300" /><h3 className="mt-8 text-xl font-semibold text-white">Input calon klien</h3><p className="mt-2 text-sm text-white/50">Catat prospek baru dan pantau status booking.</p></Link><Link href="/sales/input?tab=booking" className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-7 transition hover:bg-amber-300/10"><Banknote className="h-7 w-7 text-amber-300" /><h3 className="mt-8 text-xl font-semibold text-white">Buat pesanan</h3><p className="mt-2 text-sm text-white/50">Masukkan form pesanan klien baru ke sistem admin.</p></Link></section><section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold text-white">Data Anda - {periodLabel}</h3><select value={monthOffset} onChange={(event) => setMonthOffset(Number(event.target.value))} className="rounded-xl border border-white/10 bg-[#11181c] px-4 py-3 text-sm text-white"><option value={0}>Bulan berjalan</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={-(index + 1)}>{new Date(new Date().getFullYear(), new Date().getMonth() - index - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</option>)}</select></div>{duplicateLead && <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100"><p>{duplicateLead.error}</p>{duplicateLead.client_name && <p className="mt-1">Data terkait: <strong>{duplicateLead.client_name}</strong> ({duplicateLead.client_phone || "-"}), status {duplicateLead.status || "-"}.</p>}</div>}{showLeadForm && <LeadForm initialData={editingLead} onSave={saveLead} onClose={() => { setShowLeadForm(false); setEditingLead(null); }} />}<div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] p-2"><LeadTable leads={leads} onEdit={(lead) => { setEditingLead(lead); setShowLeadForm(true); }} onDelete={deleteLead} onStatusChange={updateStatus} /></div></section><section className="space-y-4"><h3 className="text-xl font-semibold text-white">Pesanan Anda - {periodLabel}</h3><div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/40"><tr><th className="px-5 py-4">Nota</th><th className="px-5 py-4">Klien</th><th className="px-5 py-4">Paket</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Dibuat</th></tr></thead><tbody>{bookings.map((booking) => <tr key={booking.id} className="border-b border-white/5"><td className="px-5 py-4 text-cyan-200">{booking.invoice_number || "-"}</td><td className="px-5 py-4"><p className="font-semibold text-white">{booking.client_name || "-"}</p><p className="text-xs text-white/45">{booking.client_phone || "-"}</p></td><td className="px-5 py-4 text-white/70">{booking.package_snapshot?.name || booking.service_type || "-"}</td><td className="px-5 py-4 text-white/70">{booking.status || "-"}</td><td className="px-5 py-4 text-white/50">{new Date(booking.created_at).toLocaleDateString("id-ID")}</td></tr>)}{bookings.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-white/40">Belum ada pesanan pada periode ini.</td></tr>}</tbody></table></div></section></div>;
}