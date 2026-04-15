/**
 * Types TypeScript des tables Supabase pour le bot RDV Permis.
 * À synchroniser avec le schéma SQL (voir migration initial_schema).
 */

export type CandidateStatus = "waiting" | "reserved" | "served" | "cancelled" | "failed";
export type BotStatus = "running" | "paused" | "stopped" | "error";
export type HorairePrefere = "matin" | "apres-midi";
export type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

/** Une fenêtre horaire acceptable pour un candidat */
export interface AvailabilityWindow {
  day: DayOfWeek;
  start: string; // HH:MM
  end: string;   // HH:MM
}

/** Etudiant sous mandat (synchronisé depuis RdvPermis) */
export interface RdvpermisStudent {
  candidat_id_plateforme: string;
  neph: string;
  nom: string;
  prenom: string;
  email: string;
  date_naissance: string | null;
  mandat_id: string | null;
  groupe_permis: string;
  actif: boolean;
  first_seen_at: string;
  last_synced_at: string;
}

export interface Centre {
  id: string;
  nom: string;
  code_departement: string;
  groupe_permis: string;
  actif: boolean;
  ordre: number;
  created_at: string;
}

export interface Candidate {
  id: string;
  neph: string;
  nom: string;
  prenom: string;
  email: string;
  phone: string;
  priorite: number;
  centres_acceptes: string[];
  dates_acceptees: string[];
  date_min: string | null;
  date_max: string | null;
  horaire_prefere: HorairePrefere | null;
  availability_windows: AvailabilityWindow[];
  status: CandidateStatus;
  candidat_id_plateforme: string | null;
  rdvpermis_student_id: string | null;
  creneau_id_reserve: string | null;
  creneau_details: string | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  candidate_id: string | null;
  candidate_nom: string | null;
  candidate_prenom: string | null;
  candidate_neph: string | null;
  centre_id: string | null;
  centre_nom: string;
  creneau_id: string | null;
  date_examen: string;
  heure_examen: string | null;
  inspecteur: string | null;
  success: boolean;
  error_message: string | null;
  reserved_at: string;
}

export interface BotLog {
  id: number;
  level: "INFO" | "WARNING" | "ERROR" | "SUCCESS";
  category: string;
  message: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface BotState {
  id: number;
  status: BotStatus;
  last_heartbeat: string | null;
  last_scan_at: string | null;
  last_scan_details: string | null;
  next_scan_at: string | null;
  stop_requested: boolean;
  current_mission: string | null;
  error_message: string | null;
  stats_today: { scans: number; reservations: number; errors: number };
  students_sync_requested: boolean;
  students_last_sync_at: string | null;
  students_count: number;
  students_sync_status: "idle" | "syncing" | "error";
  updated_at: string;
}

export interface ScheduledMission {
  id: string;
  label: string;
  trigger_time: string;
  target_dates: string[];
  centre_ids: string[];
  nb_places: number;
  preferred_time: HorairePrefere | null;
  status: "scheduled" | "running" | "completed" | "cancelled";
  result_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  id: number;
  rdv_username: string;
  rdv_password: string;
  scan_interval_seconds: number;
  scan_active_hours: string;
  max_slots_per_session: number;
  notify_email: string;
  notify_on_success: boolean;
  notify_on_error: boolean;
  stealth_mode: boolean;
  updated_at: string;
}
