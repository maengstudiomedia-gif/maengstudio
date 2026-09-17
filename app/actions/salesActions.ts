"use server";

import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function getSalesUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: (values) => values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesi tidak valid.");
  const { data: profile } = await supabaseAdmin.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "sales") throw new Error("Akses sales diperlukan.");
  return { user, profile };
}

function monthBounds(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return { start: start.toISOString(), end: end.toISOString(), label: start.toLocaleDateString("id-ID", { month: "long", year: "numeric" }) };
}

export async function getSalesDashboardAction() {
  try {
    const { user, profile } = await getSalesUser();
    const current = monthBounds(0);
    const previous = monthBounds(-1);
    const [{ data: currentInvoices, error: invoiceError }, { count: bookedLeads, error: leadError }] = await Promise.all([
      supabaseAdmin.from("invoices").select("total_amount, paid_amount, user_id, created_at").eq("user_id", user.id).gte("created_at", current.start).lt("created_at", current.end),
      supabaseAdmin.from("leads").select("id", { count: "exact", head: true }).eq("created_by", user.id).eq("status", "booked"),
    ]);
    if (invoiceError) throw invoiceError;
    if (leadError) throw leadError;
    const { data: previousInvoices, error: previousError } = await supabaseAdmin.from("invoices").select("paid_amount").eq("user_id", user.id).gte("created_at", previous.start).lt("created_at", previous.end);
    if (previousError) throw previousError;
    const revenue = (currentInvoices || []).reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0);
    const previousRevenue = (previousInvoices || []).reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0);
    return { success: true, data: { name: profile.full_name, revenue, previousRevenue, incentive: revenue * 0.02, previousIncentive: previousRevenue * 0.02, bookedLeads: bookedLeads || 0, monthLabel: current.label, previousMonthLabel: previous.label } };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Gagal memuat dashboard sales." };
  }
}

export async function getSalesBookingsAction(monthOffset = 0) {
  try {
    const { user } = await getSalesUser();
    const safeOffset = Number.isInteger(monthOffset) ? Math.min(0, Math.max(-24, monthOffset)) : 0;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() + safeOffset, 1).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth() + safeOffset + 1, 1).toISOString();
    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select("id, invoice_number, client_name, client_phone, event_type, status, created_at, package_snapshot, service_type")
      .eq("user_id", user.id)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Gagal memuat pesanan sales.", data: [] };
  }
}