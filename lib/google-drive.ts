import { google } from "googleapis";

export function buildClientPrintFolderName(clientName: string) {
  const trimmed = clientName.trim() || "Klien";
<<<<<<< HEAD
  return `cetak file_${trimmed}`.slice(0, 100);
=======
  return `Foto Cetak_${trimmed}`.slice(0, 100);
}

/** Buat atau ambil subfolder klien di dalam folder pusat sortiran. */
export async function getOrCreateClientPrintFolder(
  parentFolderId: string,
  clientName: string
): Promise<string> {
  const folderName = buildClientPrintFolderName(clientName);

  const response = await drive.files.list({
    q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 200,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  const existing = (response.data.files ?? []).find((file) => file.name === folderName);
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    supportsAllDrives: true,
    fields: "id",
  });

  if (!created.data.id) {
    throw new Error("Gagal membuat subfolder Foto Cetak klien.");
  }

  return created.data.id;
>>>>>>> 8892c2b (perbaikan)
}

/** @deprecated Gunakan buildClientPrintFolderName */
export function buildSortirFolderName(clientName: string) {
  return buildClientPrintFolderName(clientName);
}

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

export const googleAuth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: [DRIVE_SCOPE],
});

export const drive = google.drive({ version: "v3", auth: googleAuth });

export function extractFolderId(link: string) {
  const match = link.match(/folders\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : link;
}

/** Folder pusat sortiran — dibuat sekali di Drive, di-share ke service account (Editor). */
export function getCentralSortirFolderId() {
  const raw = process.env.GOOGLE_SORTIR_FOLDER_ID?.trim();
  if (!raw) return null;
  return extractFolderId(raw);
}

export function hasServiceAccountDriveConfig() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_PRIVATE_KEY?.trim()
  );
}
