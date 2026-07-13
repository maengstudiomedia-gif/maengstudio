"use client";

import { use, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, Maximize2, X, Check } from "lucide-react";
import { getPhotosFromDriveAction, submitClientSelectionAction } from "@/app/actions/driveActions";
import AlertModal from "@/app/(Dashboard)/admin/components/AlertModal";

type PhotoOrientation = "landscape" | "portrait" | "square";
type Photo = {
  id: string;
  name: string;
  thumbnail: string;
  url: string;
  orientation: PhotoOrientation;
};

export default function ClientGalleryPortal({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const searchParams = useSearchParams();

  const folderLinkDariAdmin = searchParams.get("drive") || "";
  const clientName = searchParams.get("name") || "Klien";
  const maxPhotos = parseInt(searchParams.get("max") || "60", 10);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState<Photo | null>(null);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const remainingPhotos = maxPhotos - selectedIds.length;

  useEffect(() => {
    if (!folderLinkDariAdmin) return;
    const fetchPhotos = async () => {
      try {
        const drivePhotos = await getPhotosFromDriveAction(folderLinkDariAdmin);
        setPhotos(drivePhotos);
      } catch {
        setErrorMessage("Gagal memuat foto dari Google Drive. Pastikan akses folder sudah Editor.");
      } finally {
        setIsLoadingPhotos(false);
      }
    };
    fetchPhotos();
  }, [folderLinkDariAdmin]);

  const togglePhotoSelection = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= maxPhotos) {
        setErrorMessage(`Maksimal hanya bisa memilih ${maxPhotos} foto!`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const runSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await submitClientSelectionAction(
        bookingId,
        clientName,
        selectedIds,
        folderLinkDariAdmin,
        maxPhotos
      );

      if (!result.success) {
        setErrorMessage(result.message || "Terjadi kesalahan saat memproses foto di Google Drive.");
        return;
      }

      setIsSuccess(true);
    } catch {
      setErrorMessage("Terjadi kesalahan saat memproses foto di Google Drive.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (selectedIds.length === 0) {
      setErrorMessage("Pilih minimal 1 foto terlebih dahulu.");
      return;
    }

    if (selectedIds.length < maxPhotos) {
      setShowIncompleteModal(true);
      return;
    }

    void runSubmit();
  };

  if (!folderLinkDariAdmin) {
    return (
      <div className="p-10 text-white text-center">
        Akses Tidak Valid. Link Drive tidak ditemukan.
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 text-center">
        <div className="bg-white/[0.03] border border-white/10 p-8 rounded-3xl max-w-md w-full">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-light text-white mb-2">Terima Kasih, {clientName}!</h2>
          <p className="text-white/60 text-sm mb-6">
            {selectedIds.length} foto telah berhasil dipindahkan ke folder sortiran Maeng Studio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-32 font-sans">
      <div className="bg-black/80 sticky top-0 z-40 backdrop-blur-md border-b border-white/5 px-6 py-4 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-xl font-light text-white tracking-wide">Pilih Foto Cetak</h1>
          <p className="text-xs text-white/50">Klien: {clientName}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-light text-amber-500">
            {selectedIds.length} <span className="text-sm text-white/40">/ {maxPhotos}</span>
          </div>
          <p className="text-[10px] text-white/40">Sisa {remainingPhotos} foto</p>
        </div>
      </div>

      <div className="p-4 md:p-8">
        {isLoadingPhotos ? (
          <div className="flex flex-col items-center justify-center py-32 text-white/40">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-amber-500" />
            <p>Memuat galeri dari Google Drive...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-32 text-white/40">
            Tidak ada foto ditemukan di folder tersebut.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {photos.map((photo) => {
              const isSelected = selectedIds.includes(photo.id);
              const aspectClass =
                photo.orientation === "landscape"
                  ? "aspect-[4/3]"
                  : photo.orientation === "square"
                    ? "aspect-square"
                    : "aspect-[3/4]";

              return (
                <div
                  key={photo.id}
                  className={`relative ${aspectClass} group cursor-pointer overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                      : "border-white/5 hover:border-white/20"
                  }`}
                  onClick={() => togglePhotoSelection(photo.id)}
                >
                  <img
                    src={photo.thumbnail}
                    alt={photo.name}
                    className={`w-full h-full object-cover transition-transform duration-500 ${
                      isSelected ? "scale-105 opacity-80" : "group-hover:scale-110"
                    }`}
                    loading="lazy"
                  />

                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-black p-1 rounded-full z-10">
                      <Check className="w-4 h-4 font-bold" />
                    </div>
                  )}

                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-8">
                    <p className="text-[10px] text-white/80 font-mono truncate">{photo.name}</p>
                  </div>

                  <button
                    className="absolute top-2 left-2 bg-black/50 hover:bg-black p-2 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomedPhoto(photo);
                    }}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent p-6 z-40 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedIds.length === 0}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-4 rounded-2xl shadow-xl transition-all flex justify-center items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Menulis ke Drive...
              </>
            ) : (
              <>Simpan {selectedIds.length} Foto Terpilih</>
            )}
          </button>
        </div>
      </div>

      {zoomedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center backdrop-blur-lg p-4">
          <button
            onClick={() => setZoomedPhoto(null)}
            className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/10 p-2 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <img
            src={zoomedPhoto.url}
            alt={zoomedPhoto.name}
            className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
          />
          <p className="text-white mt-4 font-mono">{zoomedPhoto.name}</p>

          <button
            onClick={() => {
              togglePhotoSelection(zoomedPhoto.id);
              setZoomedPhoto(null);
            }}
            className={`mt-6 px-8 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${
              selectedIds.includes(zoomedPhoto.id)
                ? "bg-rose-500/20 text-rose-500 border border-rose-500/50 hover:bg-rose-500 hover:text-white"
                : "bg-amber-500 text-black hover:bg-amber-400"
            }`}
          >
            {selectedIds.includes(zoomedPhoto.id) ? (
              <>Batal Pilih Foto Ini</>
            ) : (
              <>
                <Check className="w-5 h-5" /> Pilih Foto Ini
              </>
            )}
          </button>
        </div>
      )}

      <AlertModal
        isOpen={showIncompleteModal}
        title="Pilihan Foto Belum Lengkap"
        message={`Anda baru memilih ${selectedIds.length} dari ${maxPhotos} foto. Masih perlu memilih ${remainingPhotos} foto lagi sebelum bisa disimpan.`}
        variant="info"
        confirmLabel="Mengerti"
        onClose={() => setShowIncompleteModal(false)}
      />

      <AlertModal
        isOpen={!!errorMessage}
        title="Perhatian"
        message={errorMessage || ""}
        variant="error"
        confirmLabel="Tutup"
        onClose={() => setErrorMessage(null)}
      />
    </div>
  );
}
