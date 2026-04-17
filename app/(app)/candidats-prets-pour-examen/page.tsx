import { createClient } from "@/lib/supabase/server";
import { CandidatesClient } from "../candidats/client";
import type { Candidate, Centre } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

/**
 * Liste "Candidats en attente" (type = examen_prefecture) :
 * candidats prêts à passer l'examen, qui attendent leur date officielle
 * attribuée par la préfecture. Même UI que "Place sup", filtrée par type.
 */
export default async function CandidatsPretsPage() {
  const supabase = await createClient();

  const [candidatesRes, centresRes] = await Promise.all([
    supabase
      .from("candidates")
      .select("*")
      .eq("type", "examen_prefecture")
      .order("priorite", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("centres").select("*").eq("actif", true).order("ordre"),
  ]);

  const candidates = (candidatesRes.data ?? []) as Candidate[];
  const centres = (centresRes.data ?? []) as Centre[];

  return (
    <CandidatesClient
      initial={candidates}
      centres={centres}
      listType="examen_prefecture"
      title="Candidats en attente"
      description="Candidats prêts à passer leur examen, qui attendent la date officielle attribuée par la préfecture. Le bot réserve automatiquement dès qu'une place se libère dans leurs dates cibles."
    />
  );
}
