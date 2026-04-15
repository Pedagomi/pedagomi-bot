import { createClient } from "@/lib/supabase/server";
import { LogsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bot_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return <LogsClient initial={(data ?? []) as BotLog[]} />;
}

export interface BotLog {
  id: number;
  level: "INFO" | "SUCCESS" | "WARNING" | "ERROR" | string;
  category: string;
  message: string;
  details: Record<string, unknown> | null;
  created_at: string;
}
