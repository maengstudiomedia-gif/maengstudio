import { google } from "googleapis";

export function buildClientPrintFolderName(clientName: string) {
  const trimmed = clientName.trim() || "Klien";
  return `cetak file_${trimmed}`.slice(0, 100);
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
