import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./client";
import type { AppSettings } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("*").eq("id", 1).single();

  return <SettingsClient initial={data as AppSettings | null} />;
}
