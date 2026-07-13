"use server";

import {
  drive,
  extractFolderId,
  getCentralSortirFolderId,
  hasServiceAccountDriveConfig,
} from "@/lib/google-drive";
import { supabaseAdmin, mergeBookingNotesPatch } from "@/app/actions/adminBookings/utils";

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
    name: nextName,
    appProperties: {
      maeng_sortir: "selected",
      maeng_sortir_client: clientName.slice(0, 100),
      maeng_sortir_booking: bookingId,
    },
    supportsAllDrives: true,
    fields: "id, parents",
  });
}

async function persistSelectionToBooking(
  bookingId: string,
  clientName: string,
  selectedFileIds: string[],
  sortirFolderId: string
) {
  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("notes")
    .eq("id", bookingId)
    .single();

  const notes = mergeBookingNotesPatch(booking?.notes, {
    sortir: {
      clientName,
      folderId: sortirFolderId,
      selectedFileIds,
      selectedAt: new Date().toISOString(),
      count: selectedFileIds.length,
      mode: "move",
    },
  });

  await supabaseAdmin.from("bookings").update({ notes }).eq("id", bookingId);
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

    for (const fileId of selectedFileIds) {
      await moveSelectedFileToFolder(
        fileId,
        sourceFolderId,
        targetFolderId,
        bookingId,
        clientName
      );
    }

    await persistSelectionToBooking(bookingId, clientName, selectedFileIds, targetFolderId);

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
