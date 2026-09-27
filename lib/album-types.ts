export const ALBUM_TYPES = [
  {
    value: "tempel_10",
    label: "Album Tempel 10 Sheet",
    maxPhotos: 60,
  },
  {
    value: "kolase_10",
    label: "Album Kolase 10 Sheet",
    maxPhotos: 115,
  },
  {
    value: "kolase_15",
    label: "Album Kolase 15 Sheet",
    maxPhotos: 135,
  },
  {
    value: "tempel_15",
    label: "Album Tempel 15 Sheet",
    maxPhotos: 80,
  },
] as const;

export type AlbumTypeValue = (typeof ALBUM_TYPES)[number]["value"];

export const DEFAULT_ALBUM_TYPE: AlbumTypeValue = "kolase_10";
export const HARD_ALBUM_LIMIT = Math.max(...ALBUM_TYPES.map((album) => album.maxPhotos));

/** Legacy values stored before the tempel/kolase split. */
const LEGACY_ALBUM_MAP: Record<string, AlbumTypeValue> = {
  "10_sheet": "kolase_10",
  "15_sheet": "kolase_15",
};

export function resolveAlbumType(value: unknown): (typeof ALBUM_TYPES)[number] {
  const raw = String(value || "");
  const normalized = (LEGACY_ALBUM_MAP[raw] || raw) as AlbumTypeValue;
  return ALBUM_TYPES.find((album) => album.value === normalized) || ALBUM_TYPES.find((album) => album.value === DEFAULT_ALBUM_TYPE)!;
}

export function getAlbumMaxPhotos(value: unknown): number {
  return resolveAlbumType(value).maxPhotos;
}

export function getAlbumLabel(value: unknown): string {
  return resolveAlbumType(value).label;
}

export function normalizeAlbumMaxPhotos(
  value: number | null | undefined,
  albumType?: unknown
): number {
  const albumMax = albumType ? getAlbumMaxPhotos(albumType) : HARD_ALBUM_LIMIT;
  if (!value || !Number.isFinite(value)) return albumMax;
  return Math.min(albumMax, Math.max(1, value));
}
