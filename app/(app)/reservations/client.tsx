"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Calendar, X, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Reservation } from "@/lib/supabase/types";

export function ReservationsClient({ initial }: { initial: Reservation[] }) {
  const [reservations, setReservations] = useState<Reservation[]>(initial);
  const [selected, setSelected] = useState<Reservation | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel("reservations-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        async () => {
          const { data } = await supabase
            .from("reservations")
            .select("*")
            .order("reserved_at", { ascending: false })
            .limit(200);
          if (data) setReservations(data as Reservation[]);
        },
      )
      .subscribe();
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("reservations")
        .select("*")
        .order("reserved_at", { ascending: false })
        .limit(200);
      if (data) setReservations(data as Reservation[]);
    }, 5000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(ch);
    };
  }, []);

  const successCount = reservations.filter((r) => r.success).length;
  const failCount = reservations.length - successCount;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Réservations</h1>
        <p className="text-muted-foreground mt-1">
          Historique complet des places chopées par le bot
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-card border border-border/50 p-5">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Total
          </p>
          <p className="mt-2 text-3xl font-bold">{reservations.length}</p>
        </div>
        <div className="rounded-xl bg-card border border-border/50 p-5">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Succès
          </p>
          <p className="mt-2 text-3xl font-bold text-success">{successCount}</p>
        </div>
        <div className="rounded-xl bg-card border border-border/50 p-5">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            Echecs
          </p>
          <p className="mt-2 text-3xl font-bold text-destructive">{failCount}</p>
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
        {reservations.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Aucune réservation pour l'instant
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {reservations.map((r) => (
              <div
                key={r.id}
                className={`p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
                  !r.success ? "cursor-pointer hover:bg-destructive/5 transition-colors" : ""
                }`}
                onClick={() => !r.success && setSelected(r)}
              >
                <div
                  className={`h-11 w-11 rounded-xl inline-flex items-center justify-center shrink-0 ${
                    r.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {r.success ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">
                      {r.candidate_prenom} {r.candidate_nom}
                    </p>
                    {r.success && <Badge variant="outline" className="text-success border-success/30">Réservé</Badge>}
                    {!r.success && <Badge variant="destructive">Echec</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {r.centre_nom} · {r.date_examen}
                    {r.heure_examen && ` à ${r.heure_examen.slice(0, 5)}`}
                    {r.inspecteur && ` · Inspecteur ${r.inspecteur}`}
                  </p>
                  {r.error_message && (
                    <p className="text-xs text-destructive mt-1 line-clamp-1">{r.error_message}</p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground sm:text-right">
                  <p>{formatDateTime(r.reserved_at)}</p>
                  {r.candidate_neph && <p className="font-mono">NEPH {r.candidate_neph.slice(-4)}</p>}
                  {!r.success && (
                    <p className="text-destructive mt-1 text-[10px] uppercase tracking-wider font-semibold">
                      Cliquer pour détails
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Popup détails d'erreur */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive inline-flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Détails de l'échec</h3>
                  <p className="text-xs text-muted-foreground">{formatDateTime(selected.reserved_at)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Candidat</p>
                  <p className="text-sm font-medium mt-0.5">{selected.candidate_prenom} {selected.candidate_nom}</p>
                  {selected.candidate_neph && (
                    <p className="text-xs text-muted-foreground font-mono">NEPH {selected.candidate_neph}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Centre</p>
                  <p className="text-sm font-medium mt-0.5">{selected.centre_nom}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Date d'examen</p>
                  <p className="text-sm font-medium mt-0.5">
                    {selected.date_examen}
                    {selected.heure_examen && ` à ${selected.heure_examen.slice(0, 5)}`}
                  </p>
                </div>
                {selected.inspecteur && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Inspecteur</p>
                    <p className="text-sm font-medium mt-0.5">{selected.inspecteur}</p>
                  </div>
                )}
              </div>

              {/* Message d'erreur */}
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-destructive mb-1.5">
                  Erreur rencontrée
                </p>
                <p className="text-sm text-destructive leading-relaxed">
                  {selected.error_message || "Erreur inconnue — aucun message de détail disponible."}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-5 pt-0">
              <Button variant="outline" onClick={() => setSelected(null)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
