"use server";

import {
  drive,
  extractFolderId,
  getCentralSortirFolderId,
<<<<<<< HEAD
=======
  getOrCreateClientPrintFolder,
>>>>>>> 8892c2b (perbaikan)
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
<<<<<<< HEAD
=======
  clientFolderId?: string;
>>>>>>> 8892c2b (perbaikan)
  sourceFolderId?: string;
  selectedFileIds?: string[];
  movedFileIds?: string[];
  moveStatus?: "in_progress" | "completed";
  selectedAt?: string;
  count?: number;
  mode?: string;
};

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

function mapDriveFileToPhoto(file: {
  id?: string | null;
  name?: string | null;
  imageMediaMetadata?: { width?: number | null; height?: number | null } | null;
}): DrivePhoto | null {
  if (!file.id || !file.name) return null;
  const width = file.imageMediaMetadata?.width ?? 0;
  const height = file.imageMediaMetadata?.height ?? 0;
  const orientation: DrivePhoto["orientation"] =
    width > height ? "landscape" : width < height ? "portrait" : "square";

  return {
    id: file.id,
    name: file.name,
    thumbnail: `/api/drive-image/${file.id}?thumb=1`,
    url: `/api/drive-image/${file.id}`,
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

  const removeParents = parents.includes(sourceFolderId)
    ? sourceFolderId
    : parents.filter((parentId) => parentId !== targetFolderId).join(",");

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

async function revertMovedFileToSource(
  fileId: string,
  sourceFolderId: string,
<<<<<<< HEAD
  targetFolderId: string,
=======
>>>>>>> 8892c2b (perbaikan)
  clientName: string
) {
  const file = await drive.files.get({
    fileId,
    fields: "parents, name, appProperties",
    supportsAllDrives: true,
  });

  const parents = file.data.parents ?? [];
  if (parents.length === 1 && parents[0] === sourceFolderId) {
    return;
  }

<<<<<<< HEAD
=======
  const removeParents = parents.filter((parentId) => parentId !== sourceFolderId).join(",");

>>>>>>> 8892c2b (perbaikan)
  const prefix = `${clientName} - `;
  const storedOriginal = file.data.appProperties?.maeng_sortir_original_name;
  const originalName =
    storedOriginal ||
    (file.data.name?.startsWith(prefix) ? file.data.name.slice(prefix.length) : file.data.name) ||
    `foto-${fileId}`;

  await drive.files.update({
    fileId,
    addParents: sourceFolderId,
<<<<<<< HEAD
    removeParents: targetFolderId,
=======
    ...(removeParents ? { removeParents } : {}),
>>>>>>> 8892c2b (perbaikan)
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

async function listMovedPhotosForBooking(bookingId: string): Promise<DrivePhoto[]> {
<<<<<<< HEAD
  const targetFolderId = getCentralSortirFolderId();
  if (!targetFolderId) return [];

  const response = await drive.files.list({
    q: `'${targetFolderId}' in parents and mimeType contains 'image/' and trashed = false and appProperties has { key='maeng_sortir_booking' and value='${bookingId}' }`,
=======
  const response = await drive.files.list({
    q: `mimeType contains 'image/' and trashed = false and appProperties has { key='maeng_sortir_booking' and value='${bookingId}' }`,
>>>>>>> 8892c2b (perbaikan)
    fields: "files(id, name, imageMediaMetadata)",
    pageSize: 500,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  return (response.data.files || [])
    .map(mapDriveFileToPhoto)
    .filter((photo): photo is DrivePhoto => photo !== null);
}

<<<<<<< HEAD
=======
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

>>>>>>> 8892c2b (perbaikan)
async function persistSortirProgress(
  bookingId: string,
  clientName: string,
  sourceFolderId: string,
  sortirFolderId: string,
<<<<<<< HEAD
=======
  clientFolderId: string,
>>>>>>> 8892c2b (perbaikan)
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
      clientName,
      folderId: sortirFolderId,
<<<<<<< HEAD
=======
      clientFolderId,
>>>>>>> 8892c2b (perbaikan)
      sourceFolderId,
      movedFileIds,
      selectedFileIds: movedFileIds,
      moveStatus,
      selectedAt: existing?.selectedAt ?? new Date().toISOString(),
      count: movedFileIds.length,
      mode: "move",
    },
  });

  await supabaseAdmin.from("bookings").update({ notes }).eq("id", bookingId);
}

async function persistSelectionToBooking(
  bookingId: string,
  clientName: string,
  selectedFileIds: string[],
  sortirFolderId: string,
<<<<<<< HEAD
=======
  clientFolderId: string,
>>>>>>> 8892c2b (perbaikan)
  sourceFolderId: string
) {
  await persistSortirProgress(
    bookingId,
    clientName,
    sourceFolderId,
    sortirFolderId,
<<<<<<< HEAD
=======
    clientFolderId,
>>>>>>> 8892c2b (perbaikan)
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
export async function getPhotosFromDriveAction(folderLink: string) {
  try {
    const folderId = extractFolderId(folderLink);

    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: "files(id, name, imageMediaMetadata)",
      pageSize: 500,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = response.data.files || [];

    return files
      .filter((file) => file.id && file.name)
      .map((file) => {
        const width = file.imageMediaMetadata?.width ?? 0;
        const height = file.imageMediaMetadata?.height ?? 0;
        const orientation: "landscape" | "portrait" | "square" =
          width > height ? "landscape" : width < height ? "portrait" : "square";

        return {
          id: file.id as string,
          name: file.name as string,
          thumbnail: `/api/drive-image/${file.id}?thumb=1`,
          url: `/api/drive-image/${file.id}`,
          orientation,
        };
      });
  } catch (error) {
    console.error("Gagal mengambil foto dari Drive:", error);
    return [];
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
<<<<<<< HEAD
=======
    const clientFolderId = await resolveClientPrintFolderId(
      targetFolderId,
      clientName,
      bookingId
    );
>>>>>>> 8892c2b (perbaikan)

    for (const fileId of selectedFileIds) {
      await moveSelectedFileToFolder(
        fileId,
        sourceFolderId,
<<<<<<< HEAD
        targetFolderId,
=======
        clientFolderId,
>>>>>>> 8892c2b (perbaikan)
        bookingId,
        clientName
      );
    }

    await persistSelectionToBooking(
      bookingId,
      clientName,
      selectedFileIds,
      targetFolderId,
<<<<<<< HEAD
=======
      clientFolderId,
>>>>>>> 8892c2b (perbaikan)
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
export async function getSortirSessionAction(bookingId: string): Promise<{
  movedPhotos: DrivePhoto[];
  movedFileIds: string[];
  moveStatus: "in_progress" | "completed" | null;
}> {
  try {
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("notes")
      .eq("id", bookingId)
      .single();

    const sortirNotes = parseSortirNotes(booking?.notes);
    const drivePhotos = await listMovedPhotosForBooking(bookingId);
    const driveIds = drivePhotos.map((photo) => photo.id);
    const notesIds = sortirNotes?.movedFileIds ?? sortirNotes?.selectedFileIds ?? [];
    const mergedIds = [...new Set([...notesIds, ...driveIds])];

    const moveStatus =
      sortirNotes?.moveStatus ??
      (mergedIds.length > 0 ? "in_progress" : null);

    return {
      movedPhotos: drivePhotos,
      movedFileIds: mergedIds,
      moveStatus: moveStatus === "completed" ? "completed" : mergedIds.length > 0 ? "in_progress" : null,
    };
  } catch (error) {
    console.error("Gagal mengambil sesi sortir:", error);
    return { movedPhotos: [], movedFileIds: [], moveStatus: null };
  }
}

// ---------------------------------------------------------------------------
// 4. PINDAH SATU FOTO — dengan progress inkremental
// ---------------------------------------------------------------------------
export async function moveSinglePhotoAction(
  bookingId: string,
  clientName: string,
  fileId: string,
  originalFolderLink: string,
  maxPhotos: number
): Promise<{
  success: boolean;
  message?: string;
  movedCount?: number;
  movedFileIds?: string[];
  moveStatus?: "in_progress" | "completed";
}> {
  try {
    const targetFolderId = getCentralSortirFolderId();
    if (!targetFolderId) {
      return {
        success: false,
        message: "Folder sortiran belum dikonfigurasi di server. Hubungi admin Maeng Studio.",
      };
    }

    const sourceFolderId = extractFolderId(originalFolderLink);
<<<<<<< HEAD
=======
    const clientFolderId = await resolveClientPrintFolderId(
      targetFolderId,
      clientName,
      bookingId
    );
>>>>>>> 8892c2b (perbaikan)
    const session = await getSortirSessionAction(bookingId);
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

    await moveSelectedFileToFolder(
      fileId,
      sourceFolderId,
<<<<<<< HEAD
      targetFolderId,
=======
      clientFolderId,
>>>>>>> 8892c2b (perbaikan)
      bookingId,
      clientName
    );

    const movedFileIds = [...currentMoved, fileId];
    await persistSortirProgress(
      bookingId,
      clientName,
      sourceFolderId,
      targetFolderId,
<<<<<<< HEAD
=======
      clientFolderId,
>>>>>>> 8892c2b (perbaikan)
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
  clientName: string,
  fileId: string,
  originalFolderLink: string,
  maxPhotos: number
): Promise<{
  success: boolean;
  message?: string;
  movedCount?: number;
  movedFileIds?: string[];
}> {
  try {
    const targetFolderId = getCentralSortirFolderId();
    if (!targetFolderId) {
      return {
        success: false,
        message: "Folder sortiran belum dikonfigurasi di server.",
      };
    }

    const sourceFolderId = extractFolderId(originalFolderLink);
    const session = await getSortirSessionAction(bookingId);

    if (!session.movedFileIds.includes(fileId)) {
      return {
        success: false,
        message: "Foto ini tidak ditemukan di daftar foto yang sudah dipindahkan.",
      };
    }

<<<<<<< HEAD
    await revertMovedFileToSource(fileId, sourceFolderId, targetFolderId, clientName);
=======
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
>>>>>>> 8892c2b (perbaikan)

    const movedFileIds = session.movedFileIds.filter((id) => id !== fileId);
    await persistSortirProgress(
      bookingId,
      clientName,
      sourceFolderId,
      targetFolderId,
<<<<<<< HEAD
=======
      clientFolderId,
>>>>>>> 8892c2b (perbaikan)
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
