export type MyShift = {
  id: number; starts_at: string; ends_at: string; role: string | null; location: string | null; notes?: string | null; break_minutes?: number;
  minutes?: number; confirm?: 'confirmed' | 'declined' | null; confirm_note?: string | null; tasks?: string[];
  with?: { first_name: string; last_name: string; color: string | null; role: string | null; starts_at: string; ends_at: string }[];
  request?: { id: number; kind: 'swap' | 'drop' | 'claim'; status: string } | null;
};
export type OpenShift = { id: number; starts_at: string; ends_at: string; role: string | null; location: string | null; minutes?: number; claimed: boolean; clash: boolean | number | null };
export type MySchedule = {
  shifts: MyShift[]; open: OpenShift[]; week_minutes: number;
  requests: { id: number; shift_id: number; kind: string; status: string; starts_at: string; ends_at: string }[];
  availability: { weekday: number; kind: 'available' | 'unavailable'; start_time: string | null; end_time: string | null; note: string | null }[];
  teammates: { id: number; first_name: string; last_name: string }[];
};
