"use server";

import { drive, extractFolderId } from "@/lib/google-drive";

function escapeDriveQueryValue(value: string) {
  return value.replace(/'/g, "\\'");
}

async function findOrCreateSortirFolder(parentFolderId: string, clientName: string) {
  const folderName = `foto sortiran_${clientName}`;
  const existing = await drive.files.list({
    q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${escapeDriveQueryValue(folderName)}' and trashed = false`,
    fields: "files(id)",
    pageSize: 1,
  });

  const existingId = existing.data.files?.[0]?.id;
  if (existingId) return existingId;

  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  });

  if (!created.data.id) {
    throw new Error("Gagal membuat folder sortiran di Google Drive");
  }

  return created.data.id;
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
// 2. FUNGSI COPY FOTO SORTIRAN (Dipanggil saat Klien klik "Simpan Pilihan")
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

    const sourceFolderId = extractFolderId(originalFolderLink);
    const targetFolderId = await findOrCreateSortirFolder(sourceFolderId, clientName);

    for (const fileId of selectedFileIds) {
      const fileInfo = await drive.files.get({ fileId, fields: "name" });

      await drive.files.copy({
        fileId,
        requestBody: {
          parents: [targetFolderId],
          name: fileInfo.data.name || `foto-${fileId}`,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Gagal sinkronisasi Drive:", error);
    const detail = error instanceof Error ? error.message : "Kesalahan tidak diketahui";
    return {
      success: false,
      message: `Gagal menyalin file di Google Drive: ${detail}`,
    };
  }
}
