"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Search, User, Check, Loader2, AlertTriangle, Calendar, Award } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { PenaliteRdvPermis, RdvpermisStudent } from "@/lib/supabase/types";

function activePenalty(s: RdvpermisStudent): PenaliteRdvPermis | null {
  const list = s.penalites;
  if (!Array.isArray(list) || list.length === 0) return null;
  return list.find((p) => p.statut === "ACTIVE") ?? null;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function statutExamenLabel(s: string | null | undefined) {
  if (!s) return null;
  const map: Record<string, string> = {
    EXAMEN_REUSSI: "Réussi",
    EXAMEN_ECHOUE: "Échoué",
    EXAMEN_ABSENT: "Absent",
    EXAMEN_ANNULE: "Annulé",
  };
  return map[s] || s;
}

function StudentDetailCard({ student: s }: { student: RdvpermisStudent }) {
  const pen = activePenalty(s);
  const detail = Array.isArray(s.details_resultats) && s.details_resultats.length > 0
    ? s.details_resultats[0]
    : null;

  return (
    <div className="mt-2 rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 bg-success/10">
        <Check className="h-4 w-4 text-success" />
        <span className="font-semibold text-sm">{s.prenom} {s.nom}</span>
        <span className="text-xs text-muted-foreground font-mono ml-auto">{s.neph}</span>
      </div>

      {pen && (
        <div className="px-3 py-2 bg-destructive/5 border-b border-destructive/20 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-semibold text-destructive">
              En pénalité — jusqu'au {formatDate(pen.dateDeFin)}
            </p>
            <p className="text-muted-foreground mt-0.5">
              {pen.motif === "ECHEC_EPREUVE_PRATIQUE" ? "Suite à un échec pratique" : pen.motif}
              {" · "}durée {pen.dureeEnJour} jour{pen.dureeEnJour > 1 ? "s" : ""}
              {pen.typeEpreuvePratique ? ` · ${pen.typeEpreuvePratique.toLowerCase()}` : ""}
              {pen.dateExamen && ` · examen du ${formatDate(pen.dateExamen)}`}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 text-xs">
        {detail?.derniereDateExamenTheorique && (
          <InfoRow
            icon={<Award className="h-3.5 w-3.5 text-primary" />}
            label="Code obtenu"
            value={formatDate(detail.derniereDateExamenTheorique)}
          />
        )}
        {detail?.derniereDateExamenCirculation && (
          <InfoRow
            icon={<Calendar className="h-3.5 w-3.5 text-primary" />}
            label="Dernier examen"
            value={
              <>
                {formatDate(detail.derniereDateExamenCirculation)}
                {detail.statutExamenCirculation && (
                  <span className={cn(
                    "ml-1.5 inline-flex px-1.5 rounded text-[10px] font-semibold",
                    detail.statutExamenCirculation === "EXAMEN_REUSSI" ? "bg-success/20 text-success"
                      : detail.statutExamenCirculation === "EXAMEN_ECHOUE" ? "bg-destructive/15 text-destructive"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {statutExamenLabel(detail.statutExamenCirculation)}
                  </span>
                )}
              </>
            }
          />
        )}
        {(detail?.nombreEchecsTotal ?? 0) > 0 && (
          <InfoRow
            icon={<AlertTriangle className="h-3.5 w-3.5 text-warning" />}
            label="Échecs"
            value={`${detail!.nombreEchecsTotal} total${detail!.seuilCritiqueNombreEchecsAtteint ? " · seuil atteint" : ""}`}
          />
        )}
        {s.email && (
          <InfoRow
            icon={<User className="h-3.5 w-3.5 text-muted-foreground" />}
            label="Email"
            value={<span className="truncate">{s.email}</span>}
          />
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0">
        <div className="text-muted-foreground text-[10px] uppercase tracking-wide">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}

interface Props {
  value: RdvpermisStudent | null;
  onChange: (student: RdvpermisStudent | null) => void;
  placeholder?: string;
}

export function StudentAutocomplete({ value, onChange, placeholder = "Rechercher un élève par nom ou NEPH..." }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState<RdvpermisStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Charger les étudiants + Realtime subscription pour reflet immédiat
  // quand la sync désactive/ajoute un élève
  useEffect(() => {
    const supabase = createClient();

    async function refetch() {
      const { data } = await supabase
        .from("rdvpermis_students")
        .select("*")
        .eq("actif", true)
        .order("nom")
        .limit(2000);
      setStudents((data as RdvpermisStudent[]) ?? []);
    }

    (async () => {
      setLoading(true);
      await refetch();
      setLoading(false);
    })();

    const ch = supabase
      .channel("students-autocomplete-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rdvpermis_students" },
        () => {
          // Debounce léger pour éviter de spam sur sync 675 lignes
          refetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, []);

  // Filtre local rapide
  const filtered = useMemo(() => {
    if (!query.trim()) return students.slice(0, 20);
    const q = query.trim().toLowerCase();
    return students
      .filter((s) => {
        const full = `${s.prenom} ${s.nom}`.toLowerCase();
        return (
          s.neph.includes(q) ||
          s.nom.toLowerCase().includes(q) ||
          s.prenom.toLowerCase().includes(q) ||
          full.includes(q)
        );
      })
      .slice(0, 50);
  }, [students, query]);

  function selectStudent(s: RdvpermisStudent) {
    onChange(s);
    setQuery(`${s.prenom} ${s.nom}`);
    setOpen(false);
  }

  function clearSelection() {
    onChange(null);
    setQuery("");
    setOpen(true);
  }

  const displayValue = value ? `${value.prenom} ${value.nom}` : query;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={cn(
            "flex h-11 w-full rounded-lg border bg-background pl-10 pr-10 py-2 text-sm shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value ? "border-success/50 bg-success/5" : "border-input"
          )}
        />
        {value && (
          <button
            type="button"
            onClick={clearSelection}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {value && <StudentDetailCard student={value} />}

      {open && !value && (
        <div className="absolute z-20 mt-1 w-full max-h-80 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {loading ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              Chargement des élèves…
            </div>
          ) : students.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              Aucun élève synchronisé. Lancez la synchronisation RdvPermis depuis l'onglet Candidats.
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              Aucun résultat pour « {query} »
            </div>
          ) : (
            <>
              <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border/60">
                {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
                {students.length > 0 && ` / ${students.length} élèves sous mandat`}
              </div>
              {filtered.map((s) => {
                const activePenalite = activePenalty(s);
                return (
                  <button
                    key={s.candidat_id_plateforme}
                    type="button"
                    onClick={() => selectStudent(s)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/10 transition-colors"
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0",
                      activePenalite ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"
                    )}>
                      {activePenalite ? <AlertTriangle className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {s.prenom} <span className="uppercase">{s.nom}</span>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono flex items-center gap-2 flex-wrap">
                        <span>{s.neph}</span>
                        {activePenalite && (
                          <span className="text-destructive font-sans">
                            En pénalité jusqu'au {formatDate(activePenalite.dateDeFin)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
