import { Users, CheckCircle2, Clock, AlertCircle, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { BotStatusCard } from "@/components/dashboard/bot-status";
import { formatDateTime, formatRelative } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { BotState, Reservation, Candidate } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch en parallèle
  const [stateRes, candidatesRes, reservationsRes] = await Promise.all([
    supabase.from("bot_state").select("*").eq("id", 1).single(),
    supabase.from("candidates").select("*"),
    supabase
      .from("reservations")
      .select("*")
      .order("reserved_at", { ascending: false })
      .limit(8),
  ]);

  const state = stateRes.data as BotState | null;
  const candidates = (candidatesRes.data ?? []) as Candidate[];
  const reservations = (reservationsRes.data ?? []) as Reservation[];

  const waiting = candidates.filter((c) => c.status === "waiting").length;
  const served = candidates.filter((c) => c.status === "served").length;
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayReservations = reservations.filter((r) => r.reserved_at.startsWith(todayIso)).length;

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
          value={waiting}
          icon={Clock}
          tone="warning"
          hint="candidats à servir"
        />
        <StatCard
          label="Places aujourd'hui"
          value={todayReservations}
          icon={Zap}
          tone="success"
          hint="réservées par le bot"
        />
        <StatCard
          label="Total servis"
          value={served}
          icon={CheckCircle2}
          tone="default"
          hint="candidats avec place confirmée"
        />
        <StatCard
          label="Candidats total"
          value={candidates.length}
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
            {state?.next_scan_at && <p>Prochain scan : {formatRelative(state.next_scan_at)}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
