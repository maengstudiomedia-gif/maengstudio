"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getPackagesAction, deletePackageAction } from "@/app/actions/packages";
import PackageCard from "./PackageCard";
import PackageForm from "./PackageForm";
import AdminBookingForm from "./AdminBookingForm";
import AlertModal from "./AlertModal";
import { createBrowserClient } from "@supabase/ssr"; // Tambahan untuk mengambil session user

export default function AdminPackages() {
  const [mounted, setMounted] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);
  
  // STATE BARU: Untuk menyimpan ID Admin yang sedang login
  const [userId, setUserId] = useState<string>("");

  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any | null>(null);
  const [bookingPackage, setBookingPackage] = useState<any | null>(null);

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    isDeleting: false,
    isDone: false,
    packageId: "",
    packageName: "",
    imageUrl: ""
  });
  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: "",
    message: "",
    variant: "info" as "error" | "success" | "info",
  });

  // Inisialisasi Supabase Client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => { 
    setMounted(true);
    fetchPackages(); 
    fetchUser(); // Panggil fungsi ambil data user saat halaman dimuat
  }, []);

  // FUNGSI BARU: Ambil ID user yang sedang login
  async function fetchUser() {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      setUserId(data.user.id);
    }
  }

  async function fetchPackages() {
    setIsFetching(true);
    try {
      const data = await getPackagesAction();
      setPackages(data);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsFetching(false); 
    }
  }

  const handleAddNew = () => { setEditingPackage(null); setShowForm(true); };
  const handleEdit = (pkg: any) => { setEditingPackage(pkg); setShowForm(true); };
  const handleFormSuccess = () => { setShowForm(false); setEditingPackage(null); fetchPackages(); };
  const handleFormCancel = () => { setShowForm(false); setEditingPackage(null); };

  const openDeleteModal = (pkg: any) => {
    setDeleteModal({
      isOpen: true, isDeleting: false, isDone: false,
      packageId: pkg.id, packageName: pkg.name, imageUrl: pkg.image_url
    });
  };

  const confirmDelete = async () => {
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    const result = await deletePackageAction(deleteModal.packageId, deleteModal.imageUrl);
    if (result.success) {
      setDeleteModal(prev => ({ ...prev, isDeleting: false, isDone: true }));
      setTimeout(() => { setDeleteModal(prev => ({ ...prev, isOpen: false })); fetchPackages(); }, 1500);
    } else {
      setDeleteModal(prev => ({ ...prev, isDeleting: false }));
      setAlertState({
        isOpen: true,
        title: "Gagal Menghapus Paket",
        message: "Terjadi kesalahan saat menghapus paket. Silakan coba lagi.",
        variant: "error",
      });
    }
  };

  // KONTEN MODAL DELETE
  const deleteModalContent = deleteModal.isOpen ? (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111] border border-white/10 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        {!deleteModal.isDone ? (
          <>
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto"><AlertTriangle className="w-8 h-8 text-red-500" /></div>
            <h4 className="text-xl font-bold text-white text-center mb-2">Hapus Paket?</h4>
            <p className="text-white/50 text-center text-sm mb-8">Apakah Anda yakin ingin menghapus <span className="text-white font-semibold">"{deleteModal.packageName}"</span>? Tindakan ini tidak dapat dibatalkan.</p>
            {deleteModal.isDeleting ? (
              <div className="flex flex-col items-center py-4"><Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" /><p className="text-amber-500 text-sm font-medium">Sedang menghapus...</p></div>
            ) : (
              <div className="flex gap-4">
                <button onClick={() => setDeleteModal(prev => ({...prev, isOpen: false}))} className="flex-1 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors">Batal</button>
                <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20">Ya, Hapus</button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto"><CheckCircle2 className="w-8 h-8 text-green-500" /></div>
            <h4 className="text-xl font-bold text-white mb-2">Terhapus!</h4>
            <p className="text-white/50 text-sm">Paket telah berhasil dihapus dari sistem.</p>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/[0.02] p-6 rounded-2xl border border-white/[0.05]">
        <div>
          <h2 className="text-2xl font-bold text-white">Katalog Paket</h2>
          <p className="text-white/50 text-sm">Kelola semua layanan Audio & Dokumentasi Anda</p>
        </div>
        <button onClick={handleAddNew} className="flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-400 text-black px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-amber-500/20">
          <Plus className="w-5 h-5" />
          <span>Tambah Paket Baru</span>
        </button>
      </div>

      {/* LIST KARTU PAKET */}
      <section>
        {isFetching ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-amber-500 animate-spin" /></div>
        ) : packages.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.01] border border-dashed border-white/10 rounded-2xl text-white/30">Belum ada paket yang dibuat.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <PackageCard 
                key={pkg.id} 
                pkg={pkg} 
                onEdit={() => handleEdit(pkg)} 
                onDelete={() => openDeleteModal(pkg)} 
                onBooking={() => setBookingPackage(pkg)} 
              />
            ))}
          </div>
        )}
      </section>

      {/* RENDER FORM */}
      {showForm && (
        <PackageForm initialData={editingPackage} onSuccess={handleFormSuccess} onCancel={handleFormCancel} />
      )}

      {/* RENDER FORM BOOKING */}
      {bookingPackage && (
        <AdminBookingForm 
          userId={userId} // MENGIRIM USER ID KE FORM
          selectedPackage={bookingPackage}
          allPackages={packages}
          onSuccess={() => {
            setBookingPackage(null);
            setAlertState({
              isOpen: true,
              title: "Pesanan Berhasil",
              message: "Pesanan baru berhasil dibuat dan sudah tersimpan di sistem.",
              variant: "success",
            });
            fetchPackages();
          }}
          onCancel={() => setBookingPackage(null)}
        />
      )}

      {/* RENDER MODAL DELETE DENGAN PORTAL */}
      {mounted && deleteModalContent && createPortal(deleteModalContent, document.body)}
      {mounted && (
        <AlertModal
          isOpen={alertState.isOpen}
          title={alertState.title}
          message={alertState.message}
          variant={alertState.variant}
          confirmLabel="Oke"
          onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        />
      )}

    </div>
  );
}