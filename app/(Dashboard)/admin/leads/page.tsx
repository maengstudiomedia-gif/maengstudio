"use client";

import { useEffect, useState } from "react";
import { Plus, Users, Loader2 } from "lucide-react";
import LeadTable from "../components/LeadTable"; // Sesuaikan path import
import LeadForm from "../components/LeadForm";   // Sesuaikan path import
import { getLeadsAction, createLeadAction, updateLeadAction, updateLeadStatusAction, deleteLeadAction } from "@/app/actions/leadsActions";

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State Form & Modals
  const [showForm, setShowForm] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  
  // State untuk alasan batal
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; leadId: string }>({ isOpen: false, leadId: "" });
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setIsLoading(true);
    const res = await getLeadsAction();
    if (res.success) setLeads(res.data || []);
    setIsLoading(false);
  }

  const handleSaveForm = async (data: any) => {
    if (editingData) {
      await updateLeadAction(editingData.id, data);
    } else {
      await createLeadAction(data);
    }
    setShowForm(false);
    setEditingData(null);
    fetchLeads();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Yakin ingin menghapus data calon klien ini?")) {
      await deleteLeadAction(id);
      fetchLeads();
    }
  };

  const handleStatusChange = async (id: string, status: "booked" | "cancelled") => {
    if (status === "booked") {
      const confirmBook = confirm("Tandai klien ini sudah Deal/Sukses Booking?\nJangan lupa buatkan pesanannya di menu Katalog Paket ya!");
      if (confirmBook) {
        await updateLeadStatusAction(id, "booked");
        fetchLeads();
      }
    } else {
      // Jika batal, buka modal input alasan
      setCancelReason("");
      setCancelModal({ isOpen: true, leadId: id });
    }
  };

  const submitCancelReason = async () => {
    await updateLeadStatusAction(cancelModal.leadId, "cancelled", cancelReason);
    setCancelModal({ isOpen: false, leadId: "" });
    fetchLeads();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02] p-6 rounded-2xl border border-white/[0.05]">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" /> Data Calon Klien (Leads)
          </h2>
          <p className="text-white/50 text-sm mt-1">Kelola prospek yang bertanya atau berencana booking</p>
        </div>
        <button onClick={() => { setEditingData(null); setShowForm(true); }} className="flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20">
          <Plus className="w-5 h-5" /> <span>Tambah Calon Klien</span>
        </button>
      </div>

      <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {isLoading ? (
           <div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
        ) : (
          <LeadTable leads={leads} onEdit={(lead) => { setEditingData(lead); setShowForm(true); }} onDelete={handleDelete} onStatusChange={handleStatusChange} />
        )}
      </div>

      {showForm && (
        <LeadForm initialData={editingData} onSave={handleSaveForm} onClose={() => { setShowForm(false); setEditingData(null); }} />
      )}

      {/* Modal Input Alasan Batal */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-3xl p-6 space-y-4 text-center">
            <h3 className="text-xl font-bold text-white">Kenapa Batal?</h3>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Contoh: Harga tidak cocok / Sudah dapat vendor lain..." className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-red-500 resize-none h-24" />
            <div className="flex gap-2 pt-2">
              <button onClick={() => setCancelModal({ isOpen: false, leadId: "" })} className="flex-1 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10">Tutup</button>
              <button onClick={submitCancelReason} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600">Simpan Status Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}