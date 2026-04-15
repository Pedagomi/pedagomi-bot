"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { BotState } from "@/lib/supabase/types";

/**
 * Banner global affiché en haut de toutes les pages si le bot est en erreur.
 * Se met à jour en temps réel via Supabase Realtime.
 */
export function ErrorBanner() {
  const [state, setState] = useState<BotState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // Initial fetch
    supabase
      .from("bot_state")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => data && setState(data as BotState));

    // Live updates
    const ch = supabase
      .channel("error-banner")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bot_state" },
        (payload) => {
          setState(payload.new as BotState);
          // Reset dismissal si nouveau message
          if ((payload.new as BotState).error_message) setDismissed(false);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const hasError = state?.status === "error" && !!state.error_message;
  const heartbeatStale = (() => {
    if (!state?.last_heartbeat) return false;
    const age = Date.now() - new Date(state.last_heartbeat).getTime();
    return age > 5 * 60 * 1000; // 5 min
  })();

  // Afficher si erreur OU heartbeat obsolète (worker déconnecté)
  const show = (hasError || heartbeatStale) && !dismissed;
  if (!show) return null;

  const isStale = heartbeatStale && !hasError;

  return (
    <div
      className={`sticky top-0 z-40 border-b ${
        isStale
          ? "bg-warning/10 border-warning/40 text-warning-foreground"
          : "bg-destructive/10 border-destructive/40 text-destructive"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center gap-3 px-4 sm:px-6 py-2.5">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {isStale ? (
              <>Worker injoignable (pas de signal depuis 5 min).
                Vérifie que le worker est bien lancé sur ton Mac.</>
            ) : (
              <>Bot en erreur : {state?.error_message}</>
            )}
          </p>
        </div>
        <Link
          href="/parametres"
          className="text-sm font-semibold underline underline-offset-2 hover:no-underline shrink-0"
        >
          Corriger
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-foreground/10"
          aria-label="Ignorer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
