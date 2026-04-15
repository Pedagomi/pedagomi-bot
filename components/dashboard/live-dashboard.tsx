"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, CheckCircle2, Clock, AlertCircle, Zap } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { BotStatusCard } from "@/components/dashboard/bot-status";
import { formatDateTime, formatRelative } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { BotState, Reservation, Candidate } from "@/lib/supabase/types";

interface Props {
  initialState: BotState | null;
  initialCandidates: Candidate[];
  initialReservations: Reservation[];
}

export function LiveDashboard({ initialState, initialCandidates, initialReservations }: Props) {
  const [state, setState] = useState<BotState | null>(initialState);
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);

  // Realtime : candidates
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel("dashboard-candidates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candidates" },
        async () => {
          const { data } = await supabase.from("candidates").select("*");
          if (data) setCandidates(data as Candidate[]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Realtime : reservations
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel("dashboard-reservations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        async () => {
          const { data } = await supabase
            .from("reservations")
            .select("*")
            .order("reserved_at", { ascending: false })
            .limit(8);
          if (data) setReservations(data as Reservation[]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Realtime : bot_state (pour stats_today, heartbeat)
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel("dashboard-bot-state")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bot_state" },
        (payload) => setState(payload.new as BotState),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Dérivés (recalculés à chaque update)
  const counts = useMemo(() => {
    const waiting = candidates.filter((c) => c.status === "waiting").length;
    const served = candidates.filter((c) => c.status === "served").length;
    const todayIso = new Date().toISOString().slice(0, 10);
    const todayReservations = reservations.filter(
      (r) => r.reserved_at?.startsWith(todayIso) && r.success,
    ).length;
    return { waiting, served, todayReservations, total: candidates.length };
  }, [candidates, reservations]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">
          Supervision en temps réel du bot de réservation
        </p>
      </div>

      <BotStatusCard initial={state ?? null} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="En attente"
          value={counts.waiting}
          icon={Clock}
          tone="warning"
          hint="candidats à servir"
        />
        <StatCard
          label="Places aujourd'hui"
          value={counts.todayReservations}
          icon={Zap}
          tone="success"
          hint="réservées par le bot"
        />
        <StatCard
          label="Total servis"
          value={counts.served}
          icon={CheckCircle2}
          tone="default"
          hint="candidats avec place confirmée"
        />
        <StatCard
          label="Candidats total"
          value={counts.total}
          icon={Users}
          tone="accent"
          hint="dans la file"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Dernières réservations */}
        <div className="lg:col-span-3 rounded-xl bg-card border border-border/50">
          <div className="flex items-center justify-between p-6 pb-3">
            <div>
              <h2 className="text-lg font-semibold">Dernières réservations</h2>
              <p className="text-sm text-muted-foreground">Places chopées par le bot</p>
            </div>
            <Badge variant="outline">{reservations.length}</Badge>
          </div>
          <div className="divide-y divide-border/40">
            {reservations.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                Aucune réservation pour l'instant
              </div>
            ) : (
              reservations.map((r) => (
                <div key={r.id} className="px-6 py-4 flex items-center gap-4">
                  <div
                    className={`h-10 w-10 rounded-lg inline-flex items-center justify-center shrink-0 ${
                      r.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {r.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {r.candidate_prenom} {r.candidate_nom}
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {r.centre_nom}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.date_examen} {r.heure_examen && `à ${r.heure_examen.slice(0, 5)}`}
                      {" · "}
                      {formatRelative(r.reserved_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Statistiques bot */}
        <div className="lg:col-span-2 rounded-xl bg-card border border-border/50 p-6">
          <h2 className="text-lg font-semibold">Activité aujourd'hui</h2>
          <p className="text-sm text-muted-foreground">Statistiques du bot depuis minuit</p>
          <dl className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-muted-foreground">Scans effectués</dt>
              <dd className="text-2xl font-bold tabular-nums">{state?.stats_today?.scans ?? 0}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-muted-foreground">Réservations</dt>
              <dd className="text-2xl font-bold tabular-nums text-success">
                {state?.stats_today?.reservations ?? 0}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-muted-foreground">Erreurs</dt>
              <dd className="text-2xl font-bold tabular-nums text-destructive">
                {state?.stats_today?.errors ?? 0}
              </dd>
            </div>
          </dl>
          <div className="mt-6 pt-4 border-t border-border/40 text-xs text-muted-foreground">
            <p>Mis à jour : {state?.updated_at ? formatDateTime(state.updated_at) : "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
