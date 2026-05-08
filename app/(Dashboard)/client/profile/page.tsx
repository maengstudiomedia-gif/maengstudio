"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { ShieldCheck, User } from "lucide-react";

// Import Komponen-Komponen Anak
import TabOverview from "./components/TabOverview";
import TabNewBooking from "./components/TabNewBooking";

export default function ClientDashboard() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' atau 'new_booking'

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function getUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserData(user);
      setIsLoading(false);
    }
    getUserProfile();
  }, [router, supabase]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-amber-500/30">
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-600/5 blur-[150px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-zinc-600/10 blur-[150px] pointer-events-none"></div>

      <div className="flex flex-col md:flex-row min-h-screen relative z-10">
        

        <main className="flex-1 p-6 md:p-10 max-h-screen overflow-y-auto pb-24 md:pb-10">
          
          {/* Header Global */}
          <header className="flex justify-between items-end mb-10 pb-6 border-b border-white/[0.05]">
            <div>
              <div className="flex items-center space-x-2 text-amber-500 mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs tracking-wider uppercase">Sesi Terenkripsi</span>
              </div>
              <h2 className="text-3xl font-light">Selamat datang, <br/><span className="font-semibold">{userData?.user_metadata?.full_name || 'Klien'}</span></h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center">
              <User className="w-6 h-6 text-white/50" />
            </div>
          </header>

          {/* AREA KONTEN DINAMIS BERDASARKAN TAB YANG AKTIF */}
          {activeTab === "overview" && <TabOverview onNewBookingClick={() => setActiveTab("new_booking")} />}
          {activeTab === "new_booking" && <TabNewBooking userId={userData.id} onBack={() => setActiveTab("overview")} />}
          
        </main>
      </div>
    </div>
  );
}