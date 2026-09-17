import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import SalesSidebar from "./SalesSidebar";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "sales") redirect(profile?.role === "admin" ? "/admin/dashboard" : "/client/profile");
  return <div className="min-h-screen bg-[#080b0d] text-white md:flex"><SalesSidebar salesName={profile.full_name || "Sales"} /><main className="min-w-0 flex-1 p-5 pb-24 md:p-10 md:pb-10">{children}</main></div>;
}