// Lokasi file: app/(Dashboard)/admin/layout.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Sidebar from "./components/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {}, // Hanya membaca di layout
      },
    }
  );

  // 1. Cek Sesi Login
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // 2. Cek Pangkat (Role) di tabel profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/client/profile"); // Jika klien nyasar, kembalikan ke dasbor klien
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-rose-500/30 flex flex-col md:flex-row relative">
      {/* Ambient Latar Belakang Khusus Admin (Warna Rose/Merah) */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-600/5 blur-[150px] pointer-events-none"></div>
      
      {/* Sidebar Statis */}
      <Sidebar adminName={profile.full_name} />

      {/* Konten Dinamis (Berubah sesuai halaman yang diklik) */}
      <main className="flex-1 p-6 md:p-10 max-h-screen overflow-y-auto pb-24 md:pb-10 relative z-10">
        {children}
      </main>
    </div>
  );
}