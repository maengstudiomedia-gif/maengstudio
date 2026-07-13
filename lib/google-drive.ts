import { google } from "googleapis";

export const googleAuth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/drive"],
});

export const drive = google.drive({ version: "v3", auth: googleAuth });

export function extractFolderId(link: string) {
  const match = link.match(/folders\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : link;
}
