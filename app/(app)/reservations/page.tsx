import { createClient } from "@/lib/supabase/server";
import { ReservationsClient } from "./client";
import type { Reservation } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function ReservationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reservations")
    .select("*")
    .order("reserved_at", { ascending: false })
    .limit(200);

  return <ReservationsClient initial={(data ?? []) as Reservation[]} />;
}
