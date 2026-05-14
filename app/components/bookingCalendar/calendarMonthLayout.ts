/** Senin = kolom pertama */
export function weekdayMondayIndex(year: number, month: number): number {
  const wd = new Date(year, month, 1).getDay();
  return wd === 0 ? 6 : wd - 1;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export const WEEK_LABELS_ID = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"] as const;
