"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Pause, Play, Square, AlertTriangle, Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { formatRelative } from "@/lib/utils";
import type { BotState } from "@/lib/supabase/types";

export function BotStatusCard({ initial }: { initial: BotState | null }) {
  const [state, setState] = useState<BotState | null>(initial);
  const [busy, setBusy] = useState(false);

  // Realtime sync de l'état du bot
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("bot-state")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bot_state" },
        (payload) => setState(payload.new as BotState),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function sendAction(action: "pause" | "resume" | "stop") {
    setBusy(true);
    const supabase = createClient();
    const updates: Partial<BotState> = {};
    if (action === "pause") updates.status = "paused";
    if (action === "resume") updates.status = "running";
    if (action === "stop") {
      updates.stop_requested = true;
      updates.status = "stopped";
    }

    // Optimistic update : on reflète le changement immédiatement côté UI
    // (le worker mettra ~1-3s à confirmer via Realtime)
    const previous = state;
    setState((prev) => (prev ? { ...prev, ...updates } as BotState : prev));

    const { error } = await supabase.from("bot_state").update(updates).eq("id", 1);
    setBusy(false);
    if (error) {
      // Rollback si l'update a échoué
      setState(previous);
      toast.error("Erreur : " + error.message);
      return;
    }
    toast.success(
      action === "pause" ? "Bot en pause" : action === "resume" ? "Bot redémarré" : "Bot arrêté",
    );
  }

  const status = state?.status ?? "stopped";
  const colorMap = {
    running: "text-success bg-success",
    paused: "text-warning bg-warning",
    stopped: "text-muted-foreground bg-muted-foreground",
    error: "text-destructive bg-destructive",
  } as const;
  const labelMap = {
    running: "Actif — en surveillance",
    paused: "En pause",
    stopped: "Arrêté",
    error: "Erreur — vérifier les logs",
  } as const;

  return (
    <div className="rounded-xl bg-card border border-border/50 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className={`h-12 w-12 rounded-xl inline-flex items-center justify-center ${colorMap[status].replace("bg-", "bg-").split(" ")[1]}/10 ${colorMap[status].split(" ")[0]}`}
            >
              {status === "running" && <Activity className="h-6 w-6" />}
              {status === "paused" && <Pause className="h-6 w-6" />}
              {status === "stopped" && <Square className="h-6 w-6" />}
              {status === "error" && <AlertTriangle className="h-6 w-6" />}
            </div>
            {status === "running" && (
              <motion.div
                className="absolute inset-0 rounded-xl bg-success/20"
                animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
              État du bot
            </p>
            <p className="text-xl font-bold">{labelMap[status]}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {state?.last_heartbeat
                ? `Dernier signal ${formatRelative(state.last_heartbeat)}`
                : "Aucun signal récent"}
              {state?.last_scan_at ? ` · Dernier scan ${formatRelative(state.last_scan_at)}` : ""}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {status !== "running" && (
            <Button onClick={() => sendAction("resume")} disabled={busy} variant="success">
              <Play className="h-4 w-4" /> Démarrer
            </Button>
          )}
          {status === "running" && (
            <Button onClick={() => sendAction("pause")} disabled={busy} variant="outline">
              <Pause className="h-4 w-4" /> Pause
            </Button>
          )}
          <Button onClick={() => sendAction("stop")} disabled={busy || status === "stopped"} variant="destructive">
            <Power className="h-4 w-4" /> Stop
          </Button>
        </div>
      </div>

      {state?.error_message && (
        <div className="mt-4 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {state.error_message}
        </div>
      )}
    </div>
  );
}
