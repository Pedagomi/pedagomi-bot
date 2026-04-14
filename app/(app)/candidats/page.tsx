import { createClient } from "@/lib/supabase/server";
import { CandidatesClient } from "./client";
import type { Candidate, Centre } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  const supabase = await createClient();

  const [candidatesRes, centresRes] = await Promise.all([
    supabase
      .from("candidates")
      .select("*")
      .order("priorite", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("centres").select("*").eq("actif", true).order("ordre"),
  ]);

  const candidates = (candidatesRes.data ?? []) as Candidate[];
  const centres = (centresRes.data ?? []) as Centre[];

  return <CandidatesClient initial={candidates} centres={centres} />;
}
