import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
export const STORAGE_BUCKET = "images";

export type EventDetail = {
  date?: string;
  [key: string]: unknown;
};

export type BookingPayload = {
  userId: string;
  invoice_number: string;
  package_id: string;
  service_type: string;
  client_name: string;
  client_phone: string;
  event_type?: string;
  custom_event_type?: string;
  booker_type?: string;
  bride_name?: string;
  groom_name?: string;
  event_details: EventDetail[];
  total_price: number;
};

export type UpdateBookingPayload = {
  id: string;
  client_name?: string;
  client_phone?: string;
  event_type?: string;
  custom_event_type?: string;
  booker_type?: string;
  bride_name?: string;
  groom_name?: string;
  event_details?: EventDetail[];
};

export type ProcessStage = "awaiting_settlement" | "edit_process" | "print_process" | "completed" | "picked_up";

export type BookingProcessMeta = {
  stage: ProcessStage;
  paidOffAt?: string;
  editStartedAt?: string;
  printStartedAt?: string;
  completedAt?: string;
  pickedUpAt?: string;
  pickupProofUrl?: string;
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}

export function parseEventDetails(eventDetails: unknown): EventDetail[] {
  if (!eventDetails) return [];
  if (typeof eventDetails === "string") {
    try {
      const parsed = JSON.parse(eventDetails) as unknown;
      return Array.isArray(parsed) ? (parsed as EventDetail[]) : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(eventDetails) ? (eventDetails as EventDetail[]) : [eventDetails as EventDetail];
}

export function parseProcessMeta(notes: unknown): BookingProcessMeta {
  if (!notes) return { stage: "awaiting_settlement" };
  let source: unknown = notes;
  if (typeof notes === "string") {
    try {
      source = JSON.parse(notes);
    } catch {
      return { stage: "awaiting_settlement" };
    }
  }
  if (!source || typeof source !== "object") return { stage: "awaiting_settlement" };
  const obj = source as Record<string, unknown>;
  const process = obj.process && typeof obj.process === "object" ? (obj.process as Record<string, unknown>) : obj;
  return {
    stage: (process.stage as ProcessStage) || "awaiting_settlement",
    paidOffAt: typeof process.paidOffAt === "string" ? process.paidOffAt : undefined,
    editStartedAt: typeof process.editStartedAt === "string" ? process.editStartedAt : undefined,
    printStartedAt: typeof process.printStartedAt === "string" ? process.printStartedAt : undefined,
    completedAt: typeof process.completedAt === "string" ? process.completedAt : undefined,
    pickedUpAt: typeof process.pickedUpAt === "string" ? process.pickedUpAt : undefined,
    pickupProofUrl: typeof process.pickupProofUrl === "string" ? process.pickupProofUrl : undefined,
  };
}

export function mergeProcessMetaAsNotes(existingNotes: unknown, process: BookingProcessMeta): string {
  let base: Record<string, unknown> = {};
  if (existingNotes && typeof existingNotes === "string") {
    try {
      const parsed = JSON.parse(existingNotes) as unknown;
      if (parsed && typeof parsed === "object") base = parsed as Record<string, unknown>;
    } catch {}
  } else if (existingNotes && typeof existingNotes === "object") {
    base = existingNotes as Record<string, unknown>;
  }
  return JSON.stringify({ ...base, process });
}