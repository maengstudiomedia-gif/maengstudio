"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import {
  drive,
  extractFolderId,
  getCentralSortirFolderId,
  getOrCreateClientPrintFolder,
  hasServiceAccountDriveConfig,
} from "@/lib/google-drive";
import { supabaseAdmin, mergeBookingNotesPatch } from "@/app/actions/adminBookings/utils";

type DrivePhoto = {
  id: string;
  name: string;
  thumbnail: string;
  url: string;
  orientation: "landscape" | "portrait" | "square";
};

type SortirNotes = {
  clientName?: string;
  folderId?: string;
  clientFolderId?: string;
  sourceFolderId?: string;
  driveLink?: string;
  maxPhotos?: number;
  albumType?: string;
  sendCount?: number;
  portalConfiguredAt?: string;
  selectedFileIds?: string[];
  movedFileIds?: string[];
  pendingFileIds?: string[];
  moveStatus?: "in_progress" | "completed";
  selectedAt?: string;
  count?: number;
  mode?: string;
  portalToken?: string;
};

export type SortirSession = {
  movedPhotos: DrivePhoto[];
  movedFileIds: string[];
  pendingFileIds: string[];
  moveStatus: "in_progress" | "completed" | null;
  driveLink: string | null;
  sourceFolderId: string | null;
  clientName: string | null;
  maxPhotos: number | null;
};

const HARD_ALBUM_LIMIT = 135;

function buildDriveFolderLink(sourceFolderId: string): string {
  return `https://drive.google.com/drive/folders/${sourceFolderId}`;
}

function normalizeMaxPhotos(value: number | null | undefined): number {
  if (!value || !Number.isFinite(value)) return HARD_ALBUM_LIMIT;
  return Math.min(HARD_ALBUM_LIMIT, Math.max(1, value));
}

function parseSortirNotes(notes: unknown): SortirNotes | null {
  if (!notes) return null;
  let source: unknown = notes;
  if (typeof notes === "string") {
    try {
      source = JSON.parse(notes) as unknown;
    } catch {
      return null;
    }
  }
  if (!source || typeof source !== "object") return null;
  const sortir = (source as { sortir?: unknown }).sortir;
  if (!sortir || typeof sortir !== "object") return null;
  return sortir as SortirNotes;
}

async function requirePortalNotes(bookingId: string, portalToken: string): Promise<SortirNotes> {
  if (!portalToken || portalToken.length < 32) {
    throw new Error("Akses portal tidak valid.");
  }

  const { data: booking, error } = await supabaseAdmin
    .from("bookings")
    .select("notes")
    .eq("id", bookingId)
    .single();

  if (error) throw new Error("Booking portal tidak ditemukan.");

  const notes = parseSortirNotes(booking?.notes);
  if (!notes?.portalToken || notes.portalToken !== portalToken) {
    throw new Error("Akses portal tidak valid atau sudah kedaluwarsa.");
  }

  return notes;
}

async function requireAdminForPortalConfig() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Anda harus login sebagai admin.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Akses admin diperlukan.");
}

function mapDriveFileToPhoto(
  file: {
  id?: string | null;
  name?: string | null;
  imageMediaMetadata?: { width?: number | null; height?: number | null } | null;
  },
  bookingId: string,
  portalToken: string
): DrivePhoto | null {
  if (!file.id || !file.name) return null;
  const width = file.imageMediaMetadata?.width ?? 0;
  const height = file.imageMediaMetadata?.height ?? 0;
  const orientation: DrivePhoto["orientation"] =
    width > height ? "landscape" : width < height ? "portrait" : "square";

  return {
    id: file.id,
    name: file.name,
    thumbnail: `/api/drive-image/${file.id}?thumb=1&booking=${encodeURIComponent(bookingId)}&portal=${encodeURIComponent(portalToken)}`,
    url: `/api/drive-image/${file.id}?booking=${encodeURIComponent(bookingId)}&portal=${encodeURIComponent(portalToken)}`,
    orientation,
  };
}

async function moveSelectedFileToFolder(
  fileId: string,
  sourceFolderId: string,
  targetFolderId: string,
  bookingId: string,
  clientName: string
) {
  const file = await drive.files.get({
    fileId,
    fields: "parents, name",
    supportsAllDrives: true,
  });

  const parents = file.data.parents ?? [];
  if (parents.length === 1 && parents[0] === targetFolderId) {
    return;
  }

  if (!parents.includes(sourceFolderId)) {
    throw new Error("Foto tidak berasal dari folder sumber booking ini.");
  }

  const removeParents = parents.includes(sourceFolderId)
    ? sourceFolderId
    : parents.filter((parentId: string) => parentId !== targetFolderId).join(",");

  const originalName = file.data.name || `foto-${fileId}`;
  const nextName = `${clientName} - ${originalName}`.slice(0, 240);

  await drive.files.update({
    fileId,
    addParents: targetFolderId,
    ...(removeParents ? { removeParents } : {}),
    requestBody: {
      name: nextName,
      appProperties: {
        maeng_sortir: "selected",
        maeng_sortir_client: clientName.slice(0, 100),
        maeng_sortir_booking: bookingId,
        maeng_sortir_original_name: originalName.slice(0, 100),
      },
    },
    supportsAllDrives: true,
    fields: "id, parents",
  });
}

async function revertMovedFileToSource(fileId: string, sourceFolderId: string, clientName: string) {
  const file = await drive.files.get({
    fileId,
    fields: "parents, name, appProperties",
    supportsAllDrives: true,
  });

  const parents = file.data.parents ?? [];
  if (parents.length === 1 && parents[0] === sourceFolderId) {
    return;
  }

  const removeParents = parents.filter((parentId: string) => parentId !== sourceFolderId).join(",");

  const prefix = `${clientName} - `;
  const storedOriginal = file.data.appProperties?.maeng_sortir_original_name;
  const originalName =
    storedOriginal ||
    (file.data.name?.startsWith(prefix) ? file.data.name.slice(prefix.length) : file.data.name) ||
    `foto-${fileId}`;

  await drive.files.update({
    fileId,
    addParents: sourceFolderId,
    ...(removeParents ? { removeParents } : {}),
    requestBody: {
      name: originalName.slice(0, 240),
      appProperties: {
        maeng_sortir: null,
        maeng_sortir_client: null,
        maeng_sortir_booking: null,
        maeng_sortir_original_name: null,
      } as unknown as Record<string, string>,
    },
    supportsAllDrives: true,
    fields: "id, parents",
  });
}

async function resolvePhotosFromFileIds(
  fileIds: string[],
  bookingId: string,
  portalToken: string
): Promise<DrivePhoto[]> {
  const photos: DrivePhoto[] = [];

  for (const fileId of fileIds) {
    try {
      const file = await drive.files.get({
        fileId,
        fields: "id, name, imageMediaMetadata, trashed",
        supportsAllDrives: true,
      });
      if (file.data.trashed) continue;
      const photo = mapDriveFileToPhoto(file.data, bookingId, portalToken);
      if (photo) photos.push(photo);
    } catch {
      /* abaikan file yang tidak bisa diakses */
    }
  }

  return photos;
}

async function listMovedPhotosForBooking(
  bookingId: string,
  sortirNotes: SortirNotes,
  portalToken: string
): Promise<DrivePhoto[]> {
  const bookingQuery = `appProperties has { key='maeng_sortir_booking' and value='${bookingId}' } and mimeType contains 'image/' and trashed = false`;

  const response = await drive.files.list({
    q: bookingQuery,
    fields: "files(id, name, imageMediaMetadata)",
    pageSize: 500,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const drivePhotos = (response.data.files || [])
    .map((file) => mapDriveFileToPhoto(file, bookingId, portalToken))
    .filter((photo: DrivePhoto | null): photo is DrivePhoto => photo !== null);

  const notesIds = sortirNotes?.movedFileIds ?? sortirNotes?.selectedFileIds ?? [];
  const foundIds = new Set(drivePhotos.map((photo) => photo.id));
  const missingIds = notesIds.filter((id) => !foundIds.has(id));

  if (missingIds.length === 0) return drivePhotos;

  const fallbackPhotos = await resolvePhotosFromFileIds(missingIds, bookingId, portalToken);
  return [...drivePhotos, ...fallbackPhotos];
}

async function resolveClientPrintFolderId(
  centralFolderId: string,
  clientName: string,
  bookingId: string
): Promise<string> {
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("notes")
    .eq("id", bookingId)
    .single();

  const existing = parseSortirNotes(booking?.notes);
  if (existing?.clientFolderId) {
    return existing.clientFolderId;
  }

  return getOrCreateClientPrintFolder(centralFolderId, clientName);
}

async function persistSortirProgress(
  bookingId: string,
  clientName: string,
  sourceFolderId: string,
  sortirFolderId: string,
  clientFolderId: string,
  movedFileIds: string[],
  maxPhotos: number
) {
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("notes")
    .eq("id", bookingId)
    .single();

  const existing = parseSortirNotes(booking?.notes);
  const moveStatus = movedFileIds.length >= maxPhotos ? "completed" : "in_progress";

  const notes = mergeBookingNotesPatch(booking?.notes, {
    sortir: {
      ...(existing ?? {}),
      clientName,
      folderId: sortirFolderId,
      clientFolderId,
      sourceFolderId,
      movedFileIds,
      selectedFileIds: movedFileIds,
      moveStatus,
      selectedAt: existing?.selectedAt ?? new Date().toISOString(),
      count: movedFileIds.length,
      mode: "move",
      pendingFileIds: [],
    },
  });

  await supabaseAdmin.from("bookings").update({ notes }).eq("id", bookingId);
}

async function persistSelectionToBooking(
  bookingId: string,
  clientName: string,
  selectedFileIds: string[],
  sortirFolderId: string,
  clientFolderId: string,
  sourceFolderId: string
) {
  await persistSortirProgress(
    bookingId,
    clientName,
    sourceFolderId,
    sortirFolderId,
    clientFolderId,
    selectedFileIds,
    selectedFileIds.length
  );
}

export async function checkGoogleDriveConfigAction(): Promise<{
  ready: boolean;
  message: string;
}> {
  if (!hasServiceAccountDriveConfig()) {
    return {
      ready: false,
      message: "Service account Google Drive belum dikonfigurasi.",
    };
  }

  const centralFolderId = getCentralSortirFolderId();
  if (!centralFolderId) {
    return {
      ready: false,
      message: "Tambahkan GOOGLE_SORTIR_FOLDER_ID di .env (folder pusat sortiran).",
    };
  }

  try {
    await drive.files.get({
      fileId: centralFolderId,
      fields: "id, name",
      supportsAllDrives: true,
    });
    return {
      ready: true,
      message: "Google Drive siap (service account + folder sortiran).",
    };
  } catch {
    return {
      ready: false,
      message:
        "Folder sortiran tidak bisa diakses. Share folder ke service account dengan akses Editor.",
    };
  }
}

// ---------------------------------------------------------------------------
// 1. FUNGSI MENGAMBIL FOTO DARI DRIVE (Digunakan di Halaman Galeri Klien)
// ---------------------------------------------------------------------------
export async function getPhotosFromDriveAction(
  bookingId: string,
  portalToken: string
): Promise<DrivePhoto[]> {
  try {
    const sortirNotes = await requirePortalNotes(bookingId, portalToken);
    const folderId = sortirNotes.sourceFolderId;
    if (!folderId) throw new Error("Folder sumber portal belum dikonfigurasi.");

    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: "files(id, name, imageMediaMetadata)",
      pageSize: 500,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = response.data.files || [];

    return files
      .filter((file: { id?: string | null; name?: string | null }) => file.id && file.name)
      .map((file: { id?: string | null; name?: string | null; imageMediaMetadata?: { width?: number | null; height?: number | null } | null }) => {
        return mapDriveFileToPhoto(file, bookingId, portalToken);
      })
      .filter((photo: DrivePhoto | null): photo is DrivePhoto => photo !== null);
  } catch (error) {
    console.error("Gagal mengambil foto dari Drive:", error);
    throw new Error("Gagal memuat galeri dari Google Drive.");
  }
}

// ---------------------------------------------------------------------------
// 2. FUNGSI SIMPAN SORTIRAN — pindah foto ke folder pusat (tanpa OAuth)
// ---------------------------------------------------------------------------
export async function submitClientSelectionAction(
  bookingId: string,
  clientName: string,
  selectedFileIds: string[],
  originalFolderLink: string,
  maxPhotos: number
): Promise<{ success: boolean; message?: string }> {
  try {
    if (selectedFileIds.length !== maxPhotos) {
      const sisa = maxPhotos - selectedFileIds.length;
      return {
        success: false,
        message: `Anda harus memilih tepat ${maxPhotos} foto. Masih kurang ${sisa} foto.`,
      };
    }

    const targetFolderId = getCentralSortirFolderId();
    if (!targetFolderId) {
      return {
        success: false,
        message:
          "Folder sortiran belum dikonfigurasi di server. Hubungi admin Maeng Studio.",
      };
    }

    const sourceFolderId = extractFolderId(originalFolderLink);
    const clientFolderId = await resolveClientPrintFolderId(targetFolderId, clientName, bookingId);

    for (const fileId of selectedFileIds) {
      await moveSelectedFileToFolder(fileId, sourceFolderId, clientFolderId, bookingId, clientName);
    }

    await persistSelectionToBooking(
      bookingId,
      clientName,
      selectedFileIds,
      targetFolderId,
      clientFolderId,
      sourceFolderId
    );

    return { success: true };
  } catch (error) {
    console.error("Gagal sinkronisasi Drive:", error);
    const detail = error instanceof Error ? error.message : "Kesalahan tidak diketahui";
    return {
      success: false,
      message: `Gagal menyimpan pilihan foto: ${detail}`,
    };
  }
}

// ---------------------------------------------------------------------------
// 3. SESI SORTIR — foto sudah dipindah + status lanjutan
// ---------------------------------------------------------------------------
export async function getSortirSessionAction(
  bookingId: string,
  portalToken: string
): Promise<SortirSession> {
  const sortirNotes = await requirePortalNotes(bookingId, portalToken);

  try {
    const drivePhotos = await listMovedPhotosForBooking(bookingId, sortirNotes, portalToken);
    const driveIds = drivePhotos.map((photo) => photo.id);
    const notesIds = sortirNotes?.movedFileIds ?? sortirNotes?.selectedFileIds ?? [];
    const mergedIds = [...new Set([...notesIds, ...driveIds])];

    const photoById = new Map(drivePhotos.map((photo) => [photo.id, photo]));
    const stillMissing = mergedIds.filter((id) => !photoById.has(id));
    if (stillMissing.length > 0) {
      const fallbackPhotos = await resolvePhotosFromFileIds(stillMissing, bookingId, portalToken);
      for (const photo of fallbackPhotos) {
        photoById.set(photo.id, photo);
      }
    }

    const mergedPhotos = mergedIds
      .map((id) => photoById.get(id))
      .filter((photo): photo is DrivePhoto => Boolean(photo));

    const moveStatus =
      sortirNotes?.moveStatus ??
      (mergedIds.length > 0 ? "in_progress" : null);

    const sourceFolderId = sortirNotes?.sourceFolderId ?? null;
    const driveLink =
      sortirNotes?.driveLink ??
      (sourceFolderId ? buildDriveFolderLink(sourceFolderId) : null);

    return {
      movedPhotos: mergedPhotos,
      movedFileIds: mergedIds,
      pendingFileIds: sortirNotes?.pendingFileIds ?? [],
      moveStatus:
        moveStatus === "completed" ? "completed" : mergedIds.length > 0 ? "in_progress" : null,
      driveLink,
      sourceFolderId,
      clientName: sortirNotes?.clientName ?? null,
      maxPhotos: sortirNotes?.maxPhotos ?? null,
    };
  } catch (error) {
    console.error("Gagal mengambil sesi sortir:", error);
    throw new Error("Gagal memuat sesi portal.");
  }
}

export async function savePendingSelectionAction(
  bookingId: string,
  portalToken: string,
  pendingFileIds: string[]
): Promise<{ success: boolean }> {
  try {
    await requirePortalNotes(bookingId, portalToken);
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("notes")
      .eq("id", bookingId)
      .single();

    const existing = parseSortirNotes(booking?.notes) ?? {};

    const notes = mergeBookingNotesPatch(booking?.notes, {
      sortir: {
        ...existing,
        pendingFileIds,
      },
    });

    const { error } = await supabaseAdmin.from("bookings").update({ notes }).eq("id", bookingId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Gagal menyimpan pilihan sementara:", error);
    return { success: false };
  }
}

export async function persistPortalConfigAction(
  bookingId: string,
  config: {
    driveLink: string;
    maxPhotos: number;
    clientName: string;
    albumType: string;
    incrementSendCount?: boolean;
  }
): Promise<{ success: boolean; message?: string; shortPortalUrl?: string }> {
  try {
    await requireAdminForPortalConfig();
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("notes")
      .eq("id", bookingId)
      .single();

    const existing = parseSortirNotes(booking?.notes) ?? {};
    const sourceFolderId = extractFolderId(config.driveLink);
    const portalToken = randomBytes(32).toString("hex");
    const nextSendCount =
      config.incrementSendCount === true
        ? (existing.sendCount ?? 0) + 1
        : (existing.sendCount ?? 0);

    const notes = mergeBookingNotesPatch(booking?.notes, {
      sortir: {
        ...existing,
        driveLink: config.driveLink,
        sourceFolderId,
        maxPhotos: normalizeMaxPhotos(config.maxPhotos),
        clientName: config.clientName,
        albumType: config.albumType,
        portalToken,
        sendCount: nextSendCount,
        portalConfiguredAt: new Date().toISOString(),
      },
    });

    const { error } = await supabaseAdmin.from("bookings").update({ notes }).eq("id", bookingId);
    if (error) throw error;

    const { getAppBaseUrl } = await import("@/lib/app-url");
    const baseUrl = getAppBaseUrl();

    return {
      success: true,
      shortPortalUrl: `${baseUrl}/sortir/${bookingId}?token=${portalToken}`,
    };
  } catch (error) {
    console.error("Gagal menyimpan konfigurasi portal:", error);
    const detail = error instanceof Error ? error.message : "Kesalahan tidak diketahui";
    return { success: false, message: detail };
  }
}

// ---------------------------------------------------------------------------
// 4. PINDAH SATU FOTO — dengan progress inkremental
// ---------------------------------------------------------------------------
export async function moveSinglePhotoAction(
  bookingId: string,
  portalToken: string,
  fileId: string,
): Promise<{
  success: boolean;
  message?: string;
  movedCount?: number;
  movedFileIds?: string[];
  moveStatus?: "in_progress" | "completed";
}> {
  try {
    const session = await getSortirSessionAction(bookingId, portalToken);
    const clientName = session.clientName || "Klien";
    const originalFolderLink = session.driveLink;
    const maxPhotos = normalizeMaxPhotos(session.maxPhotos);
    if (!originalFolderLink) throw new Error("Folder sumber portal belum dikonfigurasi.");
    const targetFolderId = getCentralSortirFolderId();
    if (!targetFolderId) {
      return {
        success: false,
        message: "Folder sortiran belum dikonfigurasi di server. Hubungi admin Maeng Studio.",
      };
    }

    const sourceFolderId = extractFolderId(originalFolderLink);
    const clientFolderId = await resolveClientPrintFolderId(targetFolderId, clientName, bookingId);
    const currentMoved = session.movedFileIds;

    if (currentMoved.includes(fileId)) {
      return {
        success: true,
        movedCount: currentMoved.length,
        movedFileIds: currentMoved,
        moveStatus: currentMoved.length >= maxPhotos ? "completed" : "in_progress",
      };
    }

    if (currentMoved.length >= maxPhotos) {
      return {
        success: false,
        message: `Sudah mencapai batas ${maxPhotos} foto. Tidak bisa memindahkan foto lagi.`,
      };
    }

    await moveSelectedFileToFolder(fileId, sourceFolderId, clientFolderId, bookingId, clientName);

    const movedFileIds = [...currentMoved, fileId];
    await persistSortirProgress(
      bookingId,
      clientName,
      sourceFolderId,
      targetFolderId,
      clientFolderId,
      movedFileIds,
      maxPhotos
    );

    const moveStatus = movedFileIds.length >= maxPhotos ? "completed" : "in_progress";

    return {
      success: true,
      movedCount: movedFileIds.length,
      movedFileIds,
      moveStatus,
    };
  } catch (error) {
    console.error("Gagal memindahkan foto:", error);
    const detail = error instanceof Error ? error.message : "Kesalahan tidak diketahui";
    return {
      success: false,
      message: `Gagal memindahkan foto: ${detail}`,
    };
  }
}

// ---------------------------------------------------------------------------
// 5. KEMBALIKAN FOTO KE FOLDER ASAL
// ---------------------------------------------------------------------------
export async function revertMovedPhotoAction(
  bookingId: string,
  portalToken: string,
  fileId: string,
): Promise<{
  success: boolean;
  message?: string;
  movedCount?: number;
  movedFileIds?: string[];
}> {
  try {
    const session = await getSortirSessionAction(bookingId, portalToken);
    const clientName = session.clientName || "Klien";
    const originalFolderLink = session.driveLink;
    const maxPhotos = normalizeMaxPhotos(session.maxPhotos);
    if (!originalFolderLink) throw new Error("Folder sumber portal belum dikonfigurasi.");
    const targetFolderId = getCentralSortirFolderId();
    if (!targetFolderId) {
      return {
        success: false,
        message: "Folder sortiran belum dikonfigurasi di server.",
      };
    }

    const sourceFolderId = extractFolderId(originalFolderLink);
    if (!session.movedFileIds.includes(fileId)) {
      return {
        success: false,
        message: "Foto ini tidak ditemukan di daftar foto yang sudah dipindahkan.",
      };
    }

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("notes")
      .eq("id", bookingId)
      .single();
    const sortirNotes = parseSortirNotes(booking?.notes);
    const clientFolderId =
      sortirNotes?.clientFolderId ??
      (await resolveClientPrintFolderId(targetFolderId, clientName, bookingId));

    await revertMovedFileToSource(fileId, sourceFolderId, clientName);

    const movedFileIds = session.movedFileIds.filter((id) => id !== fileId);
    await persistSortirProgress(
      bookingId,
      clientName,
      sourceFolderId,
      targetFolderId,
      clientFolderId,
      movedFileIds,
      maxPhotos
    );

    return {
      success: true,
      movedCount: movedFileIds.length,
      movedFileIds,
    };
  } catch (error) {
    console.error("Gagal mengembalikan foto:", error);
    const detail = error instanceof Error ? error.message : "Kesalahan tidak diketahui";
    return {
      success: false,
      message: `Gagal mengembalikan foto: ${detail}`,
    };
  }
}
