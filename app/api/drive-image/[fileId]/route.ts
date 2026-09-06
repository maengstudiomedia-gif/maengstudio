import { NextRequest, NextResponse } from "next/server";
import { drive, googleAuth } from "@/lib/google-drive";
import { supabaseAdmin } from "@/app/actions/adminBookings/utils";

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

function getSortirNotes(notes: unknown): { portalToken?: string; sourceFolderId?: string } | null {
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
  return sortir && typeof sortir === "object"
    ? (sortir as { portalToken?: string; sourceFolderId?: string })
    : null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params;
  const useThumbnail = request.nextUrl.searchParams.get("thumb") === "1";
  const isDownload = request.nextUrl.searchParams.get("download") === "1";
  const bookingId = request.nextUrl.searchParams.get("booking");
  const portalToken = request.nextUrl.searchParams.get("portal");

  if (!fileId || !bookingId || !portalToken) {
    return NextResponse.json({ error: "File ID required" }, { status: 400 });
  }

  try {
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("notes")
      .eq("id", bookingId)
      .single();
    const sortirNotes = getSortirNotes(booking?.notes);
    if (!sortirNotes?.portalToken || sortirNotes.portalToken !== portalToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fileMeta = await drive.files.get({
      fileId,
      fields: "parents, appProperties, mimeType, trashed",
      supportsAllDrives: true,
    });
    const parents = fileMeta.data.parents ?? [];
    const belongsToBooking =
      parents.includes(sortirNotes.sourceFolderId || "") ||
      fileMeta.data.appProperties?.maeng_sortir_booking === bookingId;
    if (fileMeta.data.trashed || !fileMeta.data.mimeType?.startsWith("image/") || !belongsToBooking) {
      return NextResponse.json({ error: "Image not available" }, { status: 404 });
    }

    let fileName = `foto-${fileId}`;

    if (isDownload) {
      const meta = await drive.files.get({
        fileId,
        fields: "name",
        supportsAllDrives: true,
      });
      if (meta.data.name) fileName = meta.data.name;
    }

    const image = useThumbnail
      ? (await fetchThumbnail(fileId)) ?? (await fetchFullImage(fileId))
      : await fetchFullImage(fileId);

    return new NextResponse(image.data, {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "private, max-age=86400",
        ...(isDownload && {
          "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        }),
      },
    });
  } catch (error) {
    console.error("Drive image proxy error:", error);
    return NextResponse.json({ error: "Failed to load image" }, { status: 404 });
  }
}
