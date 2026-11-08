export const MAX_BOOKING_EVENT_DAYS = 2;

export function calculatePackageTotal(
  basePrice: unknown,
  extraDayPrice: unknown,
  eventCount: number,
  allowExtraDays: boolean
) {
  const base = Number(basePrice);
  const dailyExtra = Number(extraDayPrice);
  const baseAmount = Number.isFinite(base) ? base : 0;
  const extraAmount = Number.isFinite(dailyExtra) ? Math.max(dailyExtra, 0) : 0;

  return baseAmount + (allowExtraDays ? Math.max(eventCount - 1, 0) * extraAmount : 0);
}