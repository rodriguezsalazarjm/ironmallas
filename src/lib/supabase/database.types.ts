// Schema contract for Fase 2A. Regenerate with Supabase CLI after applying migration.
export type Profile = { id: string; full_name: string; role: "SUPERADMIN" | "ADMIN"; active: boolean; created_at: string };
export type Contact = { id: string; name: string; phone: string; email: string; address: string | null; commune: string | null; is_client: boolean; created_at: string };
export type LeadStatus = { id: string; key: string; name: string; position: number; active: boolean; is_final: boolean };
export type Lead = { id: string; contact_id: string; service: string; message: string | null; status_id: string; source: string; tracking: Record<string, string>; consent: boolean; consent_at: string; created_at: string; last_activity_at: string; next_follow_up_at: string | null };
export type Activity = { id: string; lead_id: string; type: string; note: string; responsible_id: string; created_at: string; next_follow_up_at: string | null };
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
export type Database = {
  public: {
    Tables: { profiles: Table<Profile>; contacts: Table<Contact>; leads: Table<Lead>; lead_statuses: Table<LeadStatus>; lead_activities: Table<Activity> };
    Views: { [_ in never]: never };
    Functions: {
      submit_public_lead: { Args: { payload: Record<string, unknown>; rate_key: string }; Returns: string };
      record_lead_activity: { Args: { target: string; new_status: string; activity_type: string; body: string; follow_up: string | null }; Returns: string };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
