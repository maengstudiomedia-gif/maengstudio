"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, UserCog } from "lucide-react";
import { getManagedUsersAction, updateUserRoleAction, type ManagedRole } from "@/app/actions/usersActions";

type ManagedUser = { id: string; email: string; full_name: string; role: ManagedRole | "client"; created_at: string; last_sign_in_at?: string };

export default function AccountsPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function loadUsers() {
    setLoading(true);
    const result = await getManagedUsersAction();
    if (result.success) setUsers(result.data as ManagedUser[]);
    else setError(result.error || "Gagal memuat akun.");
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  async function changeRole(userId: string, role: ManagedRole) {
    setSaving(userId);
    const result = await updateUserRoleAction(userId, role);
    if (!result.success) setError(result.error || "Role gagal diubah.");
    else setUsers((current) => current.map((user) => user.id === userId ? { ...user, role } : user));
    setSaving(null);
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="border-b border-white/[0.05] pb-6">
        <div className="flex items-center gap-3 text-rose-400"><UserCog className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.2em]">Access control</span></div>
        <h2 className="mt-3 text-3xl font-light text-white">Kelola User</h2>
        <p className="mt-2 text-sm text-white/45">Atur peran admin, sales, dan customer dari satu tempat.</p>
      </header>
      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-rose-400" /></div> : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40"><tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Terdaftar</th><th className="px-6 py-4">Login terakhir</th><th className="px-6 py-4">Peran</th></tr></thead>
            <tbody>{users.map((user) => <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02]">
              <td className="px-6 py-4"><p className="font-semibold text-white">{user.full_name}</p><p className="text-xs text-white/45">{user.email}</p></td>
              <td className="px-6 py-4 text-white/55">{new Date(user.created_at).toLocaleDateString("id-ID")}</td>
              <td className="px-6 py-4 text-white/55">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("id-ID") : "Belum login"}</td>
              <td className="px-6 py-4"><div className="flex items-center gap-3">{saving === user.id ? <Loader2 className="h-4 w-4 animate-spin text-rose-400" /> : <ShieldCheck className="h-4 w-4 text-rose-400" />}<select value={user.role === "client" ? "customer" : user.role} onChange={(event) => changeRole(user.id, event.target.value as ManagedRole)} className="rounded-lg border border-white/10 bg-[#171717] px-3 py-2 text-sm text-white outline-none focus:border-rose-400"><option value="customer">Customer</option><option value="sales">Sales</option><option value="admin">Admin</option></select></div></td>
            </tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}