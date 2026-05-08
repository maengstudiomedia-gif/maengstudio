// app/(Dashboard)/admin/components/types.ts

export type EventDetail = {
  id?: string;
  date?: string;
  time?: string;
  title?: string;
  address?: string;
  [key: string]: unknown;
};

export type InvoiceRow = {
  id?: string;
  total_amount?: number;
  dp_amount?: number;
  paid_amount?: number;
  payment_status?: string;
};

export type BookingRow = {
  id: string;
  invoice_number?: string;
  client_name?: string;
  client_phone?: string;
  package_name?: string;
  package_type?: string;
  event_type?: string;
  booker_type?: string;
  bride_name?: string;
  groom_name?: string;
  event_details?: EventDetail[] | string | null;
  status?: string;
  invoice?: InvoiceRow | null;
  custom_event_type?: string;
  process?: {
    stage?: "awaiting_settlement" | "edit_process" | "print_process" | "completed" | "picked_up";
    paidOffAt?: string;
    editStartedAt?: string;
    printStartedAt?: string;
    completedAt?: string;
    pickedUpAt?: string;
    pickupProofUrl?: string;
  };
};