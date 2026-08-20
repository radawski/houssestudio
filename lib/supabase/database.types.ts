/**
 * Tipos de la base, escritos a mano para que coincidan con
 * `supabase/migrations/`. Cuando instales la CLI de Supabase podes regenerarlos
 * con:
 *
 *   supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts
 *
 * Si tocas una migracion, actualiza este archivo en el mismo commit.
 */

export type AppointmentStatus =
  | "pendiente"
  | "confirmado"
  | "completado"
  | "cancelado"
  | "no_show";

export type PaymentMethod = "efectivo" | "transferencia";
export type EmailType = "confirmacion" | "cancelacion" | "recordatorio";
export type EmailStatus = "enviado" | "error";

type Timestamps = { created_at: string; updated_at: string };

export type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  sort_order: number;
} & Timestamps;

export type BusinessHour = {
  weekday: number;
  is_closed: boolean;
  /** `HH:MM:SS` en hora local del local. */
  opens_at: string;
  /** `HH:MM:SS` en hora local del local. */
  closes_at: string;
  updated_at: string;
};

export type TimeBlock = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  created_at: string;
};

export type Customer = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
} & Timestamps;

export type Appointment = {
  id: string;
  customer_id: string;
  service_id: string | null;
  service_name_at_booking: string;
  price_at_booking: number;
  duration_minutes_at_booking: number;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  manage_token_hash: string;
  customer_note: string | null;
  cancellation_reason: string | null;
  cancelled_by: "cliente" | "barbero" | null;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
} & Timestamps;

export type Payment = {
  id: string;
  appointment_id: string;
  amount: number;
  method: PaymentMethod;
  paid_at: string;
  created_at: string;
};

export type EmailLogEntry = {
  id: string;
  appointment_id: string | null;
  type: EmailType;
  to_email: string;
  status: EmailStatus;
  provider_id: string | null;
  error: string | null;
  sent_at: string;
};

export type Settings = {
  id: boolean;
  business_name: string;
  address: string | null;
  phone: string | null;
  cancellation_window_hours: number;
  reminder_hours_before: number;
  min_booking_lead_minutes: number;
  updated_at: string;
};

/** Campos que la base completa sola y nunca se mandan en un insert. */
type Generated = "id" | "created_at" | "updated_at";

type TableShape<Row, InsertOptional extends keyof Row = never> = {
  Row: Row;
  Insert: Omit<Row, Generated | InsertOptional> &
    Partial<Pick<Row, Extract<Generated | InsertOptional, keyof Row>>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string; created_at?: string };
        Update: { user_id?: string; created_at?: string };
        Relationships: [];
      };
      services: TableShape<Service, "description" | "is_active" | "sort_order">;
      business_hours: {
        Row: BusinessHour;
        Insert: BusinessHour;
        Update: Partial<BusinessHour>;
        Relationships: [];
      };
      time_blocks: TableShape<TimeBlock, "reason">;
      customers: TableShape<Customer, "email" | "notes">;
      appointments: TableShape<
        Appointment,
        | "status"
        | "customer_note"
        | "cancellation_reason"
        | "cancelled_by"
        | "confirmed_at"
        | "completed_at"
        | "cancelled_at"
      >;
      payments: TableShape<Payment, "paid_at">;
      email_log: TableShape<
        EmailLogEntry,
        "appointment_id" | "status" | "provider_id" | "error" | "sent_at"
      > & { Row: EmailLogEntry };
      settings: {
        Row: Settings;
        Insert: Partial<Settings>;
        Update: Partial<Settings>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      appointment_status: AppointmentStatus;
      payment_method: PaymentMethod;
      email_type: EmailType;
      email_status: EmailStatus;
    };
    CompositeTypes: Record<never, never>;
  };
};
