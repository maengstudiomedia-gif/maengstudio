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
  package_id?: string;
  package_name?: string;
  package_price?: number;
  package_type?: string;
  service_type?: string;
  event_type?: string;
  booker_type?: string;
  bride_name?: string;
  groom_name?: string;
  event_details?: EventDetail[] | string | null;
  status?: string;
  invoice?: InvoiceRow | null;
  custom_event_type?: string;
  package_snapshot?: Record<string, unknown> | null;
  /** Diisi dari notes.addon_package_ids + join ke katalog */
  addon_package_ids?: string[];
  addon_packages?: Array<{ id: string; name: string; type: string; price: number }>;
  /** Nilai DP yang tercatat (notes.dp_paid_amount) untuk struk pelunasan */
  dp_paid_amount?: number;
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