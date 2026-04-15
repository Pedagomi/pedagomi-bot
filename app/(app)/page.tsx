import { createClient } from "@/lib/supabase/server";
import { LiveDashboard } from "@/components/dashboard/live-dashboard";
import type { BotState, Reservation, Candidate } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [stateRes, candidatesRes, reservationsRes] = await Promise.all([
    supabase.from("bot_state").select("*").eq("id", 1).single(),
    supabase.from("candidates").select("*"),
    supabase
      .from("reservations")
      .select("*")
      .order("reserved_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <LiveDashboard
      initialState={(stateRes.data as BotState | null) ?? null}
      initialCandidates={(candidatesRes.data ?? []) as Candidate[]}
      initialReservations={(reservationsRes.data ?? []) as Reservation[]}
    />
  );
}
