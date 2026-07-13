"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  X,
  Check,
  FolderCheck,
  Undo2,
  Eye,
  Download,
} from "lucide-react";
import {
  getPhotosFromDriveAction,
  getSortirSessionAction,
  moveSinglePhotoAction,
  revertMovedPhotoAction,
} from "@/app/actions/driveActions";
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
  const [movedPhotos, setMovedPhotos] = useState<Photo[]>([]);
  const [movedFileIds, setMovedFileIds] = useState<string[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moveProgress, setMoveProgress] = useState<{ current: number; total: number } | null>(null);
  const [submitInitialMovedCount, setSubmitInitialMovedCount] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState<Photo | null>(null);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showMovedPanel, setShowMovedPanel] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [confirmRevertId, setConfirmRevertId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const movedCount = movedFileIds.length;
  const totalCommitted = movedCount + selectedIds.length;
  const remainingSlots = maxPhotos - movedCount;
  const remainingToSelect = maxPhotos - totalCommitted;

  const refreshSession = useCallback(async () => {
    const session = await getSortirSessionAction(bookingId);
    setMovedPhotos(session.movedPhotos);
    setMovedFileIds(session.movedFileIds);
    if (session.moveStatus === "completed") {
      setIsSuccess(true);
    }
    return session;
  }, [bookingId]);

  useEffect(() => {
    if (!folderLinkDariAdmin) return;
    const fetchPhotos = async () => {
      try {
        const [drivePhotos, session] = await Promise.all([
          getPhotosFromDriveAction(folderLinkDariAdmin),
          getSortirSessionAction(bookingId),
        ]);
        setPhotos(drivePhotos);
        setMovedPhotos(session.movedPhotos);
        setMovedFileIds(session.movedFileIds);
        if (session.moveStatus === "completed") {
          setIsSuccess(true);
        }
      } catch {
        setErrorMessage("Gagal memuat foto dari Google Drive. Pastikan akses folder sudah Editor.");
      } finally {
        setIsLoadingPhotos(false);
      }
    };
    void fetchPhotos();
  }, [folderLinkDariAdmin, bookingId]);

  const togglePhotoSelection = (id: string) => {
    if (movedFileIds.includes(id)) return;
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= remainingSlots) {
        setErrorMessage(
          movedCount > 0
            ? `Anda sudah memindahkan ${movedCount} foto. Maksimal bisa memilih ${remainingSlots} foto lagi.`
            : `Maksimal hanya bisa memilih ${maxPhotos} foto!`
        );
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleDownload = async (photo: Photo) => {
    setDownloadingId(photo.id);
    try {
      const response = await fetch(`${photo.url}?download=1`);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = photo.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setErrorMessage("Gagal mengunduh foto. Silakan coba lagi.");
    } finally {
      setDownloadingId(null);
    }
  };

  const runSubmit = async () => {
    const idsToMove = [...selectedIds];
    const initialMovedCount = movedFileIds.length;
    setIsSubmitting(true);
    setMoveProgress({ current: 0, total: idsToMove.length });

    let successCount = 0;
    let latestMovedIds = [...movedFileIds];

    try {
      for (let i = 0; i < idsToMove.length; i++) {
        const fileId = idsToMove[i];
        setMoveProgress({ current: i + 1, total: idsToMove.length });

        const result = await moveSinglePhotoAction(
          bookingId,
          clientName,
          fileId,
          folderLinkDariAdmin,
          maxPhotos
        );

        if (!result.success) {
          setErrorMessage(
            result.message ||
              `Gagal pada foto ke-${i + 1}. ${successCount} foto berhasil dipindahkan sebelumnya.`
          );
          await refreshSession();
          const refreshedPhotos = await getPhotosFromDriveAction(folderLinkDariAdmin);
          setPhotos(refreshedPhotos);
          setSelectedIds(idsToMove.slice(i));
          return;
        }

        successCount++;
        if (result.movedFileIds) {
          latestMovedIds = result.movedFileIds;
          setMovedFileIds(result.movedFileIds);
        }

        if (result.moveStatus === "completed") {
          setIsSuccess(true);
          return;
        }
      }

      setSelectedIds([]);
      const session = await refreshSession();
      const refreshedPhotos = await getPhotosFromDriveAction(folderLinkDariAdmin);
      setPhotos(refreshedPhotos);

      if (session.moveStatus === "completed" || latestMovedIds.length >= maxPhotos) {
        setIsSuccess(true);
      }
    } catch {
      setErrorMessage(
        `Terjadi kesalahan jaringan. ${successCount} foto berhasil dipindahkan. Silakan coba lagi untuk sisanya.`
      );
      await refreshSession();
    } finally {
      setIsSubmitting(false);
      setMoveProgress(null);
    }
  };

  const handleSubmit = () => {
    if (selectedIds.length === 0) {
      setErrorMessage("Pilih minimal 1 foto terlebih dahulu.");
      return;
    }

    if (totalCommitted < maxPhotos) {
      setShowIncompleteModal(true);
      return;
    }

    void runSubmit();
  };

  const handleRevert = async (fileId: string) => {
    setRevertingId(fileId);
    setConfirmRevertId(null);
    try {
      const result = await revertMovedPhotoAction(
        bookingId,
        clientName,
        fileId,
        folderLinkDariAdmin,
        maxPhotos
      );

      if (!result.success) {
        setErrorMessage(result.message || "Gagal mengembalikan foto ke folder asli.");
        return;
      }

      if (result.movedFileIds) {
        setMovedFileIds(result.movedFileIds);
      }
      setIsSuccess(false);

      const [session, refreshedPhotos] = await Promise.all([
        refreshSession(),
        getPhotosFromDriveAction(folderLinkDariAdmin),
      ]);
      setMovedPhotos(session.movedPhotos);
      setPhotos(refreshedPhotos);
    } catch {
      setErrorMessage("Gagal mengembalikan foto. Periksa koneksi internet Anda.");
    } finally {
      setRevertingId(null);
    }
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
            {movedCount || maxPhotos} foto telah berhasil dipindahkan ke folder
            <span className="text-emerald-400/90"> Foto Cetak_{clientName}</span> di Maeng Studio.
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
            {totalCommitted} <span className="text-sm text-white/40">/ {maxPhotos}</span>
          </div>
          <p className="text-[10px] text-white/40">
            {movedCount > 0
              ? `${movedCount} sudah dipindah · sisa ${remainingToSelect} pilih`
              : `Sisa ${remainingToSelect} foto`}
          </p>
        </div>
      </div>

      {movedCount > 0 && (
        <div className="px-4 md:px-8 pt-4">
          <button
            onClick={() => setShowMovedPanel(true)}
            className="w-full flex items-center justify-between gap-3 bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500/50 rounded-2xl px-4 py-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FolderCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-left">
                <p className="text-sm text-emerald-300 font-medium">
                  {movedCount} foto sudah dipindahkan
                </p>
                <p className="text-[11px] text-white/40">
                  Ketuk untuk lihat atau kembalikan ke folder asli
                </p>
              </div>
            </div>
            <div className="flex -space-x-2">
              {movedPhotos.slice(0, 4).map((photo) => (
                <img
                  key={photo.id}
                  src={photo.thumbnail}
                  alt=""
                  className="w-8 h-8 rounded-lg object-cover border-2 border-[#0a0a0a]"
                />
              ))}
              {movedCount > 4 && (
                <div className="w-8 h-8 rounded-lg bg-white/10 border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] text-white/60">
                  +{movedCount - 4}
                </div>
              )}
            </div>
          </button>
        </div>
      )}

      <div className="p-4 md:p-8">
        {isLoadingPhotos ? (
          <div className="flex flex-col items-center justify-center py-32 text-white/40">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-amber-500" />
            <p>Memuat galeri dari Google Drive...</p>
          </div>
        ) : photos.length === 0 && movedCount === 0 ? (
          <div className="text-center py-32 text-white/40">
            Tidak ada foto ditemukan di folder tersebut.
          </div>
        ) : photos.length === 0 && movedCount > 0 ? (
          <div className="text-center py-16 text-white/40">
            <p>Semua foto tersisa sudah dipindahkan.</p>
            <p className="text-sm mt-2">
              Pilih {remainingToSelect} foto lagi dari folder asli, atau kembalikan foto yang sudah dipindah.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {photos.map((photo) => {
              const isSelected = selectedIds.includes(photo.id);
              const isDownloading = downloadingId === photo.id;
              const aspectClass =
                photo.orientation === "landscape"
                  ? "aspect-[4/3]"
                  : photo.orientation === "square"
                    ? "aspect-square"
                    : "aspect-[3/4]";

              return (
                <div
                  key={photo.id}
                  className={`relative ${aspectClass} group overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                    isSelected
                      ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.35)] ring-1 ring-amber-500/30"
                      : "border-white/5 hover:border-white/20"
                  }`}
                >
                  <img
                    src={photo.thumbnail}
                    alt={photo.name}
                    className={`w-full h-full object-cover transition-transform duration-500 ${
                      isSelected ? "scale-105" : "group-hover:scale-105"
                    }`}
                    loading="lazy"
                  />

                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-black p-1.5 rounded-full z-10 shadow-lg">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200" />

                  <div className="absolute bottom-0 inset-x-0 p-2.5 space-y-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-200">
                    <p className="text-[9px] text-white/70 font-mono truncate px-0.5">{photo.name}</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setZoomedPhoto(photo)}
                        className="flex flex-col items-center justify-center gap-0.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-[9px] font-medium py-2 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Lihat
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDownload(photo)}
                        disabled={isDownloading}
                        className="flex flex-col items-center justify-center gap-0.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-[9px] font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isDownloading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        Unduh
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePhotoSelection(photo.id)}
                        className={`flex flex-col items-center justify-center gap-0.5 backdrop-blur-md text-[9px] font-medium py-2 rounded-lg transition-colors ${
                          isSelected
                            ? "bg-amber-500 text-black hover:bg-amber-400"
                            : "bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-black border border-amber-500/40"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isSelected ? "Batal" : "Pilih"}
                      </button>
                    </div>
                  </div>
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
                <Loader2 className="w-5 h-5 animate-spin" /> Memindahkan...
              </>
            ) : (
              <>
                Simpan {selectedIds.length} Foto Terpilih
                {movedCount > 0 && (
                  <span className="text-white/60 text-sm">
                    ({movedCount + selectedIds.length}/{maxPhotos})
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>

      {moveProgress && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center space-y-6">
            <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-white">Memindahkan Foto</h3>
              <p className="text-white/60 text-sm">
                Foto {moveProgress.current} dari {moveProgress.total}
                {submitInitialMovedCount > 0 && (
                  <span className="block mt-1 text-emerald-400/80">
                    Total: {submitInitialMovedCount + moveProgress.current} / {maxPhotos} foto
                  </span>
                )}
              </p>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300"
                style={{ width: `${(moveProgress.current / moveProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-white/30">
              Jangan tutup halaman ini. Proses berjalan satu per satu.
            </p>
          </div>
        </div>
      )}

      {showMovedPanel && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col">
          <div className="sticky top-0 bg-black/80 border-b border-white/10 px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-white">Foto Sudah Dipindahkan</h2>
              <p className="text-xs text-white/50">
                {movedCount} dari {maxPhotos} foto · {remainingToSelect} lagi dibutuhkan
              </p>
            </div>
            <button
              onClick={() => setShowMovedPanel(false)}
              className="text-white/50 hover:text-white bg-white/10 p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {movedPhotos.length === 0 ? (
              <p className="text-center text-white/40 py-16">Belum ada foto yang dipindahkan.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-4xl mx-auto">
                {movedPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-xl overflow-hidden border border-emerald-500/20 group"
                  >
                    <img
                      src={photo.thumbnail}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 inset-x-0 p-2 space-y-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <p className="text-[9px] text-white/70 font-mono truncate">{photo.name}</p>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => setZoomedPhoto(photo)}
                          className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 text-white text-[9px] py-1.5 rounded-lg transition-colors backdrop-blur-sm"
                        >
                          <Eye className="w-3 h-3" />
                          Lihat
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDownload(photo)}
                          disabled={downloadingId === photo.id}
                          className="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 text-white text-[9px] py-1.5 rounded-lg transition-colors backdrop-blur-sm disabled:opacity-50"
                        >
                          {downloadingId === photo.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          Unduh
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRevertId(photo.id)}
                          disabled={revertingId === photo.id || isSubmitting}
                          className="flex items-center justify-center gap-1 bg-rose-500/20 hover:bg-rose-500/80 disabled:opacity-50 text-rose-200 hover:text-white text-[9px] py-1.5 rounded-lg transition-colors backdrop-blur-sm"
                        >
                          {revertingId === photo.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Undo2 className="w-3 h-3" />
                          )}
                          Batal
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4 bg-black/80">
            <p className="text-[11px] text-white/40 text-center max-w-md mx-auto">
              Foto yang dikembalikan akan muncul kembali di galeri utama sehingga Anda bisa
              memilih penggantinya.
            </p>
          </div>
        </div>
      )}

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
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
          />
          <p className="text-white/80 mt-4 font-mono text-sm max-w-lg truncate px-4">
            {zoomedPhoto.name}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void handleDownload(zoomedPhoto)}
              disabled={downloadingId === zoomedPhoto.id}
              className="px-5 py-3 rounded-xl font-medium flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              {downloadingId === zoomedPhoto.id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              Unduh Foto
            </button>

            {!movedFileIds.includes(zoomedPhoto.id) && (
              <button
                type="button"
                onClick={() => {
                  togglePhotoSelection(zoomedPhoto.id);
                  setZoomedPhoto(null);
                }}
                className={`px-5 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${
                  selectedIds.includes(zoomedPhoto.id)
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500 hover:text-white"
                    : "bg-amber-500 text-black hover:bg-amber-400"
                }`}
              >
                {selectedIds.includes(zoomedPhoto.id) ? (
                  <>Batal Pilih</>
                ) : (
                  <>
                    <Check className="w-5 h-5" /> Pilih Foto
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <AlertModal
        isOpen={showIncompleteModal}
        title="Pilihan Foto Belum Lengkap"
        message={
          movedCount > 0
            ? `Anda sudah memindahkan ${movedCount} foto dan memilih ${selectedIds.length} foto lagi (total ${totalCommitted} dari ${maxPhotos}). Masih perlu ${remainingToSelect} foto lagi sebelum bisa disimpan.`
            : `Anda baru memilih ${selectedIds.length} dari ${maxPhotos} foto. Masih perlu memilih ${remainingToSelect} foto lagi sebelum bisa disimpan.`
        }
        variant="info"
        confirmLabel="Mengerti"
        onClose={() => setShowIncompleteModal(false)}
      />


      {confirmRevertId && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Kembalikan Foto?</h3>
              <p className="text-sm text-white/65 leading-relaxed">
                Foto ini akan dikembalikan ke folder asli di Google Drive. Anda bisa memilih foto
                pengganti dari galeri utama.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmRevertId(null)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => void handleRevert(confirmRevertId)}
                disabled={!!revertingId}
                className="px-5 py-2.5 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white font-semibold transition-colors disabled:opacity-50"
              >
                Ya, Kembalikan
              </button>
            </div>
          </div>
        </div>
      )}

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
