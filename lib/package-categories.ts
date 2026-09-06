export const PACKAGE_CATEGORIES = [
  { value: "audio", label: "Audio" },
  { value: "dokumentasi", label: "Dokumentasi" },
  { value: "dekorasi", label: "Dekorasi" },
  { value: "master ceremony", label: "Master Ceremony" },
  { value: "catering", label: "Catering" },
  { value: "bundle", label: "Bundle" },
] as const;

export type PackageCategory = (typeof PACKAGE_CATEGORIES)[number]["value"];

export function getPackageCategoryValue(value: unknown): PackageCategory | null {
  const category = PACKAGE_CATEGORIES.find((item) => item.value === String(value).toLowerCase());
  return category?.value ?? null;
}

export function getPackageCategoryLabel(value: unknown): string {
  const category = PACKAGE_CATEGORIES.find((item) => item.value === getPackageCategoryValue(value));
  return category?.label ?? String(value || "Lainnya");
}