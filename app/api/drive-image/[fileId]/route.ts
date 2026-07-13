import { NextRequest, NextResponse } from "next/server";
import { drive, googleAuth } from "@/lib/google-drive";

export const runtime = "nodejs";

async function fetchThumbnail(fileId: string) {
  const meta = await drive.files.get({
    fileId,
    fields: "thumbnailLink, mimeType",
  });

  const thumbnailLink = meta.data.thumbnailLink;
  if (!thumbnailLink) return null;

  const authClient = await googleAuth.getClient();
  const thumbResponse = await authClient.request<ArrayBuffer>({
    url: thumbnailLink,
    responseType: "arraybuffer",
  });

  return {
    data: thumbResponse.data,
    mimeType: meta.data.mimeType || "image/jpeg",
  };
}

async function fetchFullImage(fileId: string) {
  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );

  const mimeType =
    (response.headers["content-type"] as string | undefined) || "image/jpeg";

  return {
    data: response.data as ArrayBuffer,
    mimeType,
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params;
  const useThumbnail = request.nextUrl.searchParams.get("thumb") === "1";

  if (!fileId) {
    return NextResponse.json({ error: "File ID required" }, { status: 400 });
  }

  try {
    const image = useThumbnail
      ? (await fetchThumbnail(fileId)) ?? (await fetchFullImage(fileId))
      : await fetchFullImage(fileId);

    return new NextResponse(image.data, {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Drive image proxy error:", error);
    return NextResponse.json({ error: "Failed to load image" }, { status: 404 });
  }
}
