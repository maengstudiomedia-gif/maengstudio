"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, CircleUserRound, LogOut } from "lucide-react";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ClientProfilePage() {
  const router = useRouter();
  const [account, setAccount] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace(`/login?next=${encodeURIComponent("/client/profile")}`);
        return;
      }

      if (active) {
        setAccount({
          name: String(user.user_metadata?.full_name || user.user_metadata?.name || "Akun Maeng Studio"),
          email: user.email || "",
        });
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <main className="min-h-screen bg-[#f5f8f5] px-4 pb-10 text-[#18271f]">
      <header className="mx-auto flex w-full max-w-[560px] items-center gap-3 py-5">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Kembali ke beranda"
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#087b45] shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c8b82]">Maeng Studio</p>
          <h1 className="mt-0.5 text-lg font-bold">Profil</h1>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[560px]">
        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7c8b82]">Pengaturan</p>
        <div className="overflow-hidden rounded-[16px] border border-[#e3ebe5] bg-white">
          <div className="flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e9f6ed] text-[#087b45]">
              <CircleUserRound className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#849188]">Akun</p>
              <p className="mt-1 truncate text-sm font-bold">{loading ? "Memuat akun..." : account.name}</p>
              {!loading && account.email && <p className="mt-0.5 truncate text-xs text-[#819087]">{account.email}</p>}
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[#9aa69f]" />
          </div>
          <div className="border-t border-[#edf1ee] p-2">
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex min-h-11 w-full items-center gap-3 rounded-[10px] px-3 text-left text-sm font-semibold text-[#bd554c] transition-colors hover:bg-[#fff3f1]"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}