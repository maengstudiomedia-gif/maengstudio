"use client";

import { use, useState, useEffect, useCallback, useMemo } from "react";
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
  savePendingSelectionAction,
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
type PhotoFilter = "all" | "selected" | "available";

const DENSE_ALBUM_THRESHOLD = 100;
const HARD_ALBUM_LIMIT = 135;
const LEGACY_LOW_CAP = 60;

function normalizeMaxPhotos(raw: number): number {
  const normalized = Number.isFinite(raw) ? raw : HARD_ALBUM_LIMIT;
  return Math.min(
    HARD_ALBUM_LIMIT,
    Math.max(1, normalized <= LEGACY_LOW_CAP ? HARD_ALBUM_LIMIT : normalized)
  );
}

function buildFallbackPhoto(id: string, bookingId: string, portalToken: string, name?: string): Photo {
  return {
    id,
    name: name || `foto-${id.slice(0, 8)}`,
    thumbnail: `/api/drive-image/${id}?thumb=1&booking=${encodeURIComponent(bookingId)}&portal=${encodeURIComponent(portalToken)}`,
    url: `/api/drive-image/${id}?booking=${encodeURIComponent(bookingId)}&portal=${encodeURIComponent(portalToken)}`,
    orientation: "portrait",
  };
}

export default function ClientGalleryPortal({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const searchParams = useSearchParams();
  const portalToken = searchParams.get("token") || "";

  const [resolvedDriveLink, setResolvedDriveLink] = useState("");
  const [resolvedClientName, setResolvedClientName] = useState("Klien");
  const [resolvedMaxPhotos, setResolvedMaxPhotos] = useState(HARD_ALBUM_LIMIT);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [movedPhotos, setMovedPhotos] = useState<Photo[]>([]);
  const [movedFileIds, setMovedFileIds] = useState<string[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);
  const [isPageReady, setIsPageReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moveProgress, setMoveProgress] = useState<{ current: number; total: number } | null>(null);
  const [submitInitialMovedCount, setSubmitInitialMovedCount] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState<Photo | null>(null);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);
  const [showMovedPanel, setShowMovedPanel] = useState(false);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [confirmRevertId, setConfirmRevertId] = useState<string | null>(null);
  const [pendingSelectionId, setPendingSelectionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [galleryRetry, setGalleryRetry] = useState(0);
  const [photoSearch, setPhotoSearch] = useState("");
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>("all");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [pendingSaveStatus, setPendingSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const maxPhotos = resolvedMaxPhotos;
  const folderLinkDariAdmin = resolvedDriveLink;
  const clientName = resolvedClientName;

  const movedCount = movedFileIds.length;
  const totalCommitted = movedCount + selectedIds.length;
  const remainingSlots = maxPhotos - movedCount;
  const remainingToSelect = Math.max(0, maxPhotos - totalCommitted);
  const shouldWarnDenseAlbum = maxPhotos > DENSE_ALBUM_THRESHOLD && totalCommitted >= DENSE_ALBUM_THRESHOLD;
  const selectedPhotos = useMemo(
    () =>
      selectedIds.map((id) => {
        const fromGallery = photos.find((photo) => photo.id === id);
        if (fromGallery) return fromGallery;
        const fromMoved = movedPhotos.find((photo) => photo.id === id);
        if (fromMoved) return fromMoved;
        return buildFallbackPhoto(id, bookingId, portalToken);
      }),
    [photos, selectedIds, movedPhotos, bookingId, portalToken]
  );

  const displayMovedPhotos = useMemo(() => {
    if (movedPhotos.length >= movedFileIds.length) return movedPhotos;
    const photoById = new Map(movedPhotos.map((photo) => [photo.id, photo]));
    return movedFileIds.map((id) => photoById.get(id) ?? buildFallbackPhoto(id, bookingId, portalToken));
  }, [movedPhotos, movedFileIds, bookingId, portalToken]);

  const visiblePhotos = useMemo(() => {
    const normalizedSearch = photoSearch.trim().toLowerCase();
    return photos.filter((photo) => {
      const matchesSearch = !normalizedSearch || photo.name.toLowerCase().includes(normalizedSearch);
      const matchesFilter =
        photoFilter === "all" ||
        (photoFilter === "selected" && selectedIds.includes(photo.id)) ||
        (photoFilter === "available" && !selectedIds.includes(photo.id) && !movedFileIds.includes(photo.id));
      return matchesSearch && matchesFilter;
    });
  }, [photos, photoSearch, photoFilter, selectedIds, movedFileIds]);

  const previewPhotos = useMemo(() => {
    const photosById = new Map<string, Photo>();
    [...photos, ...displayMovedPhotos].forEach((photo) => photosById.set(photo.id, photo));
    return Array.from(photosById.values());
  }, [photos, displayMovedPhotos]);

  const navigatePreview = (direction: -1 | 1) => {
    if (!zoomedPhoto || previewPhotos.length < 2) return;
    const currentIndex = previewPhotos.findIndex((photo) => photo.id === zoomedPhoto.id);
    if (currentIndex < 0) return;
    const nextIndex = (currentIndex + direction + previewPhotos.length) % previewPhotos.length;
    setZoomedPhoto(previewPhotos[nextIndex]);
  };

  const refreshSession = useCallback(async () => {
    const session = await getSortirSessionAction(bookingId, portalToken);
    setMovedPhotos(session.movedPhotos);
    setMovedFileIds(session.movedFileIds);
    if (session.moveStatus === "completed") {
      setIsSuccess(true);
    }
    return session;
  }, [bookingId, portalToken]);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsPageReady(true), 180);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializePortal = async () => {
      try {
        const session = await getSortirSessionAction(bookingId, portalToken);
        if (cancelled) return;

        const driveLink = session.driveLink || "";
        const name = session.clientName || "Klien";
        const max =
          session.maxPhotos ? normalizeMaxPhotos(session.maxPhotos) : HARD_ALBUM_LIMIT;

        setResolvedDriveLink(driveLink);
        setResolvedClientName(name);
        setResolvedMaxPhotos(max);
        setMovedPhotos(session.movedPhotos);
        setMovedFileIds(session.movedFileIds);

        const restoredPending = session.pendingFileIds.filter(
          (id) => !session.movedFileIds.includes(id)
        );
        if (restoredPending.length > 0) {
          setSelectedIds(restoredPending);
        }

        if (session.moveStatus === "completed") {
          setIsSuccess(true);
        }

        if (!driveLink) {
          setConfigError(
            "Portal belum dikonfigurasi. Hubungi admin Maeng Studio untuk mendapatkan link yang valid."
          );
          return;
        }

        try {
          const drivePhotos = await getPhotosFromDriveAction(bookingId, portalToken);
          if (cancelled) return;
          setPhotos(drivePhotos);
          setGalleryError(null);
        } catch {
          if (!cancelled) {
            setGalleryError("Galeri gagal dimuat. Periksa koneksi lalu coba lagi.");
          }
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Gagal memuat foto dari Google Drive. Pastikan akses folder sudah Editor.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPhotos(false);
          setSessionLoaded(true);
        }
      }
    };

    void initializePortal();

    return () => {
      cancelled = true;
    };
  }, [bookingId, portalToken, galleryRetry]);

  useEffect(() => {
    if (!sessionLoaded || isSubmitting) return;

    let active = true;
    setPendingSaveStatus("saving");

    const timer = window.setTimeout(async () => {
      const result = await savePendingSelectionAction(bookingId, portalToken, selectedIds);
      if (!active) return;
      setPendingSaveStatus(result.success ? "saved" : "error");
    }, 800);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [selectedIds, bookingId, portalToken, sessionLoaded, isSubmitting]);

  const togglePhotoSelection = (id: string) => {
    if (movedFileIds.includes(id)) return;

    const isSelecting = !selectedIds.includes(id);
    const currentCommitted = movedCount + selectedIds.length;

    if (isSelecting) {
      if (currentCommitted >= maxPhotos) {
        setErrorMessage(
          `Batas maksimal album adalah ${maxPhotos} foto. Anda tidak dapat menambahkan foto lagi.`
        );
        return;
      }

      if (selectedIds.length >= remainingSlots) {
        setErrorMessage(
          movedCount > 0
            ? `Anda sudah memindahkan ${movedCount} foto. Maksimal bisa memilih ${remainingSlots} foto lagi.`
            : `Maksimal hanya bisa memilih ${maxPhotos} foto!`
        );
        return;
      }

      if (
        maxPhotos > DENSE_ALBUM_THRESHOLD &&
        currentCommitted >= DENSE_ALBUM_THRESHOLD &&
        currentCommitted < maxPhotos
      ) {
        setPendingSelectionId(id);
        return;
      }
    }

    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      return [...prev, id];
    });
  };


  const handleDownload = async (photo: Photo) => {
    setDownloadingId(photo.id);
    try {
      const downloadUrl = new URL(photo.url, window.location.origin);
      downloadUrl.searchParams.set("download", "1");
      const response = await fetch(downloadUrl);
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
          portalToken,
          fileId,
        );

        if (!result.success) {
          setErrorMessage(
            result.message ||
              `Gagal pada foto ke-${i + 1}. ${successCount} foto berhasil dipindahkan sebelumnya.`
          );
          await refreshSession();
          const refreshedPhotos = await getPhotosFromDriveAction(bookingId, portalToken);
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
      void savePendingSelectionAction(bookingId, portalToken, []);
      const session = await refreshSession();
      const refreshedPhotos = await getPhotosFromDriveAction(bookingId, portalToken);
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

    setShowIncompleteModal(true);
  };

  const confirmSubmit = () => {
    setShowIncompleteModal(false);
    void runSubmit();
  };

  const confirmDenseSelection = () => {
    if (!pendingSelectionId) return;
    setSelectedIds((prev) => [...prev, pendingSelectionId]);
    setPendingSelectionId(null);
  };

  const cancelDenseSelection = () => {
    setPendingSelectionId(null);
  };

  const handleRevert = async (fileId: string) => {
    setRevertingId(fileId);
    setConfirmRevertId(null);
    try {
      const result = await revertMovedPhotoAction(
        bookingId,
        portalToken,
        fileId,
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
        getPhotosFromDriveAction(bookingId, portalToken),
      ]);
      setMovedPhotos(session.movedPhotos);
      setPhotos(refreshedPhotos);
    } catch {
      setErrorMessage("Gagal mengembalikan foto. Periksa koneksi internet Anda.");
    } finally {
      setRevertingId(null);
    }
  };

  if (!isPageReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-10 shadow-lg shadow-black/20">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          <div className="text-center">
            <p className="text-lg font-semibold">Menyiapkan portal sortir foto...</p>
            <p className="mt-1 text-sm text-white/60">Halaman sedang memuat data foto dari Google Drive.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!folderLinkDariAdmin) {
    return (
      <div className="p-10 text-white text-center">
        Akses Tidak Valid. Link Drive tidak ditemukan.
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] px-4 py-8 text-white md:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 rounded-3xl border border-emerald-500/25 bg-emerald-500/[0.06] p-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-14 w-14 text-emerald-500" />
            <h2 className="text-2xl font-light">Pilihan Foto Tersimpan</h2>
            <p className="mt-2 text-sm text-white/60">
              Terima kasih, {clientName}. Foto di bawah ini sudah dipilih untuk album Anda.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3">
                <p className="text-2xl font-semibold text-emerald-300">{movedCount}</p>
                <p className="text-[11px] text-emerald-100/60">foto terpilih</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3">
                <p className="text-2xl font-semibold text-white">{movedCount} / {maxPhotos}</p>
                <p className="text-[11px] text-white/50">kuota album terpakai</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-medium">Foto yang Anda pilih</h3>
                <p className="mt-1 text-xs text-white/50">
                  Tersimpan di folder <span className="text-emerald-300">Foto Cetak_{clientName}</span>.
                </p>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300">
                {movedCount} foto tersimpan
              </span>
            </div>

            {displayMovedPhotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {displayMovedPhotos.map((photo, index) => (
                  <div key={photo.id} className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-emerald-500/20 bg-black/30">
                    <img src={photo.thumbnail} alt={photo.name} className="h-full w-full object-cover" loading="lazy" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-8">
                      <p className="truncate text-[10px] text-white/70">#{index + 1} · {photo.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setZoomedPhoto(photo)}
                      className="absolute right-2 top-2 rounded-lg bg-black/60 p-2 text-white opacity-100 backdrop-blur-sm transition-colors hover:bg-black/80"
                      aria-label={`Lihat ${photo.name}`}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-sm text-white/50">Foto terpilih belum dapat ditampilkan.</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsSuccess(false)}
            className="mt-6 w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-500/15"
          >
            Tambah atau Ganti Foto
          </button>
        </div>

        {zoomedPhoto && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-lg">
            <button
              type="button"
              onClick={() => setZoomedPhoto(null)}
              className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:text-white"
              aria-label="Tutup preview"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="flex w-full max-w-4xl items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigatePreview(-1)}
                className="rounded-full bg-white/10 px-4 py-3 text-white transition-colors hover:bg-white/20"
                aria-label="Foto sebelumnya"
              >
                &#8592;
              </button>
              <img src={zoomedPhoto.url} alt={zoomedPhoto.name} className="max-h-[75vh] max-w-[80%] rounded-lg object-contain shadow-2xl" />
              <button
                type="button"
                onClick={() => navigatePreview(1)}
                className="rounded-full bg-white/10 px-4 py-3 text-white transition-colors hover:bg-white/20"
                aria-label="Foto berikutnya"
              >
                &#8594;
              </button>
            </div>
            <p className="mt-4 max-w-lg truncate px-4 text-sm text-white/80">{zoomedPhoto.name}</p>
            <button
              type="button"
              onClick={() => void handleDownload(zoomedPhoto)}
              disabled={downloadingId === zoomedPhoto.id}
              className="mt-5 flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              {downloadingId === zoomedPhoto.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Unduh Foto
            </button>
          </div>
        )}
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
              ? `${movedCount} sudah dipindah${selectedIds.length > 0 ? ` · ${selectedIds.length} dipilih` : ""}`
              : selectedIds.length > 0
                ? `${selectedIds.length} dipilih`
                : "Pilih foto yang Anda inginkan"}
          </p>
          {pendingSaveStatus !== "idle" && (
            <p
              className={`mt-1 text-[10px] ${
                pendingSaveStatus === "error"
                  ? "text-rose-300"
                  : pendingSaveStatus === "saving"
                    ? "text-amber-300"
                    : "text-emerald-300"
              }`}
              aria-live="polite"
            >
              {pendingSaveStatus === "saving"
                ? "Menyimpan pilihan..."
                : pendingSaveStatus === "error"
                  ? "Gagal menyimpan pilihan"
                  : "Pilihan tersimpan"}
            </p>
          )}
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

      {selectedPhotos.length > 0 && (
        <div className="px-4 md:px-8 pt-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">Foto terpilih</p>
                <p className="text-[11px] text-white/50">Preview cepat dan batalkan pilihan sebelum disimpan.</p>
              </div>
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-300">
                {selectedPhotos.length} dipilih
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
              {selectedPhotos.map((photo) => (
                <div key={photo.id} className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <img src={photo.thumbnail} alt={photo.name} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-2 opacity-100">
                    <button
                      type="button"
                      onClick={() => setZoomedPhoto(photo)}
                      className="rounded-lg bg-white/10 p-1.5 text-white/90 backdrop-blur-sm transition-colors hover:bg-white/20"
                      aria-label={`Preview ${photo.name}`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePhotoSelection(photo.id)}
                      className="rounded-lg bg-rose-500/80 p-1.5 text-white transition-colors hover:bg-rose-500"
                      aria-label={`Batal pilih ${photo.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="p-4 md:p-8">
        {!isLoadingPhotos && photos.length > 0 && !galleryError && (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:flex-row md:items-center">
            <input
              type="search"
              value={photoSearch}
              onChange={(event) => setPhotoSearch(event.target.value)}
              placeholder="Cari nama foto..."
              aria-label="Cari nama foto"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-amber-500/60"
            />
            <div className="flex gap-2 overflow-x-auto">
              {([
                ["all", "Semua"],
                ["selected", "Terpilih"],
                ["available", "Belum dipilih"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPhotoFilter(value)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-xs transition-colors ${
                    photoFilter === value
                      ? "bg-amber-500 text-black"
                      : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        {isLoadingPhotos ? (
          <div className="flex flex-col items-center justify-center py-32 text-white/40">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-amber-500" />
            <p>Memuat galeri dari Google Drive...</p>
          </div>
        ) : galleryError ? (
          <div className="mx-auto max-w-md py-24 text-center text-white/60">
            <p>{galleryError}</p>
            <button
              type="button"
              onClick={() => setGalleryRetry((current) => current + 1)}
              className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-sm text-amber-200 transition-colors hover:bg-amber-500/20"
            >
              Coba Muat Ulang Galeri
            </button>
          </div>
        ) : photos.length === 0 && movedCount === 0 ? (
          <div className="text-center py-32 text-white/40">
            Tidak ada foto ditemukan di folder tersebut.
          </div>
        ) : photos.length > 0 && visiblePhotos.length === 0 ? (
          <div className="text-center py-24 text-white/40">
            Tidak ada foto yang sesuai dengan filter atau pencarian.
          </div>
        ) : photos.length === 0 && movedCount > 0 ? (
          <div className="text-center py-16 text-white/40">
            <p>Semua foto tersisa sudah dipindahkan.</p>
            <p className="text-sm mt-2">
              Pilih foto lagi dari folder asli, atau kembalikan foto yang sudah dipindah.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {visiblePhotos.map((photo) => {
              const isSelected = selectedIds.includes(photo.id);
              const isMoved = movedFileIds.includes(photo.id);
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
                    isMoved || isSelected
                      ? "border-white/20 bg-black/20"
                      : "border-white/5 hover:border-white/20"
                  }`}
                >
                  <img
                    src={photo.thumbnail}
                    alt={photo.name}
                    className={`w-full h-full object-cover transition-all duration-500 ${
                      isMoved || isSelected ? "opacity-60" : "group-hover:scale-105"
                    }`}
                    loading="lazy"
                  />

                  {(isMoved || isSelected) && (
                    <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none" />
                  )}

                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-black p-1.5 rounded-full z-20 shadow-lg">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  {isMoved && !isSelected && (
                    <div className="absolute top-2 right-2 bg-white/10 text-white text-[10px] px-2 py-1 rounded-full z-20">
                      Sudah dipindah
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
                        disabled={isMoved}
                        className={`flex flex-col items-center justify-center gap-0.5 backdrop-blur-md text-[9px] font-medium py-2 rounded-lg transition-colors ${
                          isMoved
                            ? "bg-white/10 text-white/40 cursor-not-allowed"
                            : isSelected
                              ? "bg-amber-500 text-black hover:bg-amber-400"
                              : "bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-black border border-amber-500/40"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isMoved ? "Sudah dipindah" : isSelected ? "Batal" : "Pilih"}
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
        <div className="max-w-md mx-auto pointer-events-auto space-y-3">
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
          {shouldWarnDenseAlbum && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/75">
              <p className="font-medium text-white/90">Perhatian: Album akan sangat padat.</p>
              <p className="mt-1 text-white/60">
                Anda sudah memilih {totalCommitted} foto. Desain album akan terlihat kecil dan penuh jika ditambah lebih banyak.
              </p>
              <a
                href={folderLinkDariAdmin}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-4 py-3 text-sm text-emerald-300 hover:bg-emerald-500/15 transition-colors"
              >
                Tambah Foto di Album Anda
              </a>
            </div>
          )}
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
                {movedCount} foto sudah dipindah{maxPhotos ? ` · Maksimal ${maxPhotos} foto` : ""}
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

          <div className="flex w-full max-w-4xl items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigatePreview(-1)}
              className="rounded-full bg-white/10 px-4 py-3 text-white transition-colors hover:bg-white/20"
              aria-label="Foto sebelumnya"
            >
              &#8592;
            </button>
            <img
              src={zoomedPhoto.url}
              alt={zoomedPhoto.name}
              className="max-h-[70vh] max-w-[80%] rounded-lg object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => navigatePreview(1)}
              className="rounded-full bg-white/10 px-4 py-3 text-white transition-colors hover:bg-white/20"
              aria-label="Foto berikutnya"
            >
              &#8594;
            </button>
          </div>
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
        title="Simpan pilihan foto?"
        message={`${selectedIds.length} foto akan dipindahkan ke album. Foto masih dapat dikembalikan dari portal setelah proses selesai.`}
        variant="info"
        confirmLabel="Ya, simpan"
        cancelLabel="Batal"
        onClose={confirmSubmit}
        onCancel={() => setShowIncompleteModal(false)}
      />

      <AlertModal
        isOpen={!!pendingSelectionId && maxPhotos > DENSE_ALBUM_THRESHOLD}
        title="Peringatan Album Padat"
        message="Anda sudah mencapai 100 foto. Desain album akan sangat padat dan ukuran tiap foto bisa menjadi kecil. Apakah Anda ingin melanjutkan menambahkan foto ini?"
        variant="error"
        confirmLabel="Ya, lanjutkan"
        cancelLabel="Tidak"
        onClose={confirmDenseSelection}
        onCancel={cancelDenseSelection}
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
