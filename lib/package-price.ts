export const DEFAULT_PACKAGE_PRICE_UNIT = "per paket";

export function getPackagePriceUnit(value: unknown): string {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : DEFAULT_PACKAGE_PRICE_UNIT;
}