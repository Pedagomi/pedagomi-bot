"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  CheckCheck,
  RefreshCw,
  Pencil,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, maskNeph, formatRelative } from "@/lib/utils";
import { StudentAutocomplete } from "@/components/candidates/student-autocomplete";
import { AvailabilityWindowsEditor } from "@/components/candidates/availability-windows";
import { MandateTakerModal } from "@/components/candidates/mandate-modal";
import type {
  Candidate,
  Centre,
  CandidateStatus,
  CandidateType,
  RdvpermisStudent,
  AvailabilityWindow,
  BotState,
} from "@/lib/supabase/types";

interface Props {
  initial: Candidate[];
  centres: Centre[];
  /**
   * Type de liste affichée :
   *   - "place_sup" : candidats en attente d'une place qui se libère (page "/candidats")
   *   - "examen_prefecture" : candidats prêts qui attendent leur date officielle (page "/candidats-prets-pour-examen")
   * Par défaut "place_sup" pour rester rétrocompatible avec les anciens appels.
   */
  listType?: CandidateType;
  /** Titre affiché en haut de la page. Par défaut "Place sup". */
  title?: string;
  /** Sous-titre explicatif sous le titre. */
  description?: string;
}

// Calcule le plancher effectif de date_min : aujourd'hui + 3 jours d'examen (saute le dimanche).
// Cohérent avec la fonction Postgres public.add_exam_days() utilisée par le job cron quotidien.
function addExamDays(start: Date, n: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) {
      // 0 = dimanche → on saute
      added += 1;
    }
  }
  return d;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatFrenchDate(iso: string): string {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

export function CandidatesClient({
  initial,
  centres,
  listType = "place_sup",
  title = "Place sup",
  description = "Le bot attribue les places au candidat le plus prioritaire dont les préférences matchent.",
}: Props) {
  const [candidates, setCandidates] = useState<Candidate[]>(initial);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [mandateOpen, setMandateOpen] = useState(false);
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [filter, setFilter] = useState<CandidateStatus | "all">("all");
  const [botState, setBotState] = useState<BotState | null>(null);

  useEffect(() => {
    const supabase = createClient();
    // Le canal Realtime est isolé par `listType` pour que chaque page
    // (place_sup / examen_prefecture) gère son propre abonnement sans se marcher dessus.
    const ch = supabase
      .channel(`candidates-live-${listType}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candidates" },
        async () => {
          const { data } = await supabase
            .from("candidates")
            .select("*")
            .eq("type", listType)
            .order("priorite")
            .order("created_at");
          if (data) setCandidates(data as Candidate[]);
        },
      )
      .subscribe();

    // Subscribe to bot_state for sync status
    const syncCh = supabase
      .channel(`bot-state-sync-${listType}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bot_state" },
        (payload) => setBotState(payload.new as BotState),
      )
      .subscribe();

    // Initial fetch of bot_state
    supabase
      .from("bot_state")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => data && setBotState(data as BotState));

    // Polling de secours toutes les 5s (rattrape les events Realtime ratés)
    const poll = setInterval(async () => {
      const { data: cData } = await supabase
        .from("candidates")
        .select("*")
        .eq("type", listType)
        .order("priorite")
        .order("created_at");
      if (cData) setCandidates(cData as Candidate[]);
      const { data: bData } = await supabase.from("bot_state").select("*").eq("id", 1).single();
      if (bData) setBotState(bData as BotState);
    }, 5000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(ch);
      supabase.removeChannel(syncCh);
    };
  }, [listType]);

  const filtered = useMemo(() => {
    let arr = candidates;
    if (filter !== "all") arr = arr.filter((c) => c.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      arr = arr.filter(
        (c) =>
          c.neph.includes(q) ||
          c.nom.toLowerCase().includes(q) ||
          c.prenom.toLowerCase().includes(q),
      );
    }
    return arr;
  }, [candidates, query, filter]);

  const counts = useMemo(() => ({
    all: candidates.length,
    waiting: candidates.filter((c) => c.status === "waiting").length,
    reserved: candidates.filter((c) => c.status === "reserved").length,
    served: candidates.filter((c) => c.status === "served").length,
    failed: candidates.filter((c) => c.status === "failed").length,
  }), [candidates]);

  async function removeCandidate(id: string) {
    if (!confirm("Retirer ce candidat de la file ?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("candidates").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Candidat retiré de la file");
  }

  async function markAsServed(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("candidates")
      .update({ status: "served" })
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Marqué comme servi");
  }

  async function triggerSync() {
    const supabase = createClient();
    toast.info("Synchronisation lancée, elle apparaît dans quelques secondes…");
    const { error } = await supabase
      .from("bot_state")
      .update({ students_sync_requested: true, students_sync_status: "syncing" })
      .eq("id", 1);
    if (error) toast.error(error.message);
  }

  const syncStatus = botState?.students_sync_status ?? "idle";
  const studentsCount = botState?.students_count ?? 0;
  const lastSync = botState?.students_last_sync_at;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={triggerSync} variant="outline" size="sm" disabled={syncStatus === "syncing"}>
              {syncStatus === "syncing" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Synchronisation…</>
              ) : (
                <><RefreshCw className="h-4 w-4" /> Synchroniser RdvPermis</>
              )}
            </Button>
            <Button onClick={() => setMandateOpen(true)} variant="outline" size="sm">
              <UserPlus className="h-4 w-4" /> Prendre sous mandat
            </Button>
          </div>
        </div>

        {/* CTA principale : ajouter un candidat à la file */}
        <button
          onClick={() => setFormOpen(true)}
          className="w-full rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-colors px-5 py-4 flex items-center gap-3 text-left group"
        >
          <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center shrink-0">
            <Plus className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Ajouter un candidat à la file</p>
            <p className="text-xs text-muted-foreground">
              Sélectionne un élève sous mandat, ses centres, dates et horaires préférés. Le bot s'occupe du reste.
            </p>
          </div>
          <span className="text-primary text-xl opacity-0 group-hover:opacity-100 transition-opacity">→</span>
        </button>
      </div>

      {/* Bandeau état synchronisation */}
      {(studentsCount > 0 || syncStatus !== "idle") && (
        <div className="rounded-lg bg-muted/50 border border-border/50 px-4 py-3 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            {syncStatus === "syncing" ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            )}
            <span>
              <strong>{studentsCount}</strong> élèves sous mandat synchronisés
              {lastSync && <> · dernière sync {formatRelative(lastSync)}</>}
            </span>
          </div>
          {syncStatus === "error" && (
            <span className="text-destructive">Erreur de synchronisation</span>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          <FilterPill label="Tous" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterPill label="En attente" count={counts.waiting} active={filter === "waiting"} onClick={() => setFilter("waiting")} />
          <FilterPill label="Réservés" count={counts.reserved} active={filter === "reserved"} onClick={() => setFilter("reserved")} />
          <FilterPill label="Servis" count={counts.served} active={filter === "served"} onClick={() => setFilter("served")} />
          <FilterPill label="Echecs" count={counts.failed} active={filter === "failed"} onClick={() => setFilter("failed")} />
        </div>
        <div className="relative sm:ml-auto w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher nom, NEPH…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState onCreate={() => setFormOpen(true)} studentsSynced={studentsCount > 0} />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <CandidateRow
              key={c.id}
              candidate={c}
              centres={centres}
              onDelete={() => removeCandidate(c.id)}
              onMarkServed={() => markAsServed(c.id)}
              onEdit={() => setEditing(c)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {formOpen && (
          <CandidateFormModal
            centres={centres}
            listType={listType}
            onClose={() => setFormOpen(false)}
          />
        )}
        {editing && (
          <CandidateFormModal
            centres={centres}
            listType={listType}
            candidate={editing}
            onClose={() => setEditing(null)}
          />
        )}
        {mandateOpen && (
          <MandateTakerModal onClose={() => setMandateOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterPill({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      {label}
      <span className={cn("tabular-nums px-1.5 rounded", active ? "bg-primary-foreground/20" : "bg-background")}>
        {count}
      </span>
    </button>
  );
}

function EmptyState({ onCreate, studentsSynced }: { onCreate: () => void; studentsSynced: boolean }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border py-16 px-6 text-center">
      <div className="h-14 w-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
        <Plus className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-semibold">Aucun candidat dans la file</h3>
      <p className="text-sm text-muted-foreground mt-1">
        {studentsSynced
          ? "Ajoute tes élèves avec leur NEPH et préférences. Le bot réservera automatiquement."
          : "Lance d'abord la synchronisation RdvPermis pour récupérer tes élèves sous mandat."}
      </p>
      <Button onClick={onCreate} className="mt-4">
        <Plus className="h-4 w-4" /> Ajouter mon premier candidat
      </Button>
    </div>
  );
}

function statusPresentation(status: CandidateStatus) {
  switch (status) {
    case "waiting":
      return { icon: Clock, label: "En attente", cls: "text-warning bg-warning/10" };
    case "reserved":
      return { icon: CheckCheck, label: "Panier", cls: "text-primary bg-primary/10" };
    case "served":
      return { icon: CheckCircle2, label: "Servi", cls: "text-success bg-success/10" };
    case "failed":
      return { icon: XCircle, label: "Echec", cls: "text-destructive bg-destructive/10" };
    case "cancelled":
      return { icon: XCircle, label: "Annulé", cls: "text-muted-foreground bg-muted" };
  }
}

function formatWindowsSummary(windows: AvailabilityWindow[]): string {
  if (!windows.length) return "Tous horaires";
  const dayLabels: Record<string, string> = {
    monday: "Lun", tuesday: "Mar", wednesday: "Mer",
    thursday: "Jeu", friday: "Ven", saturday: "Sam", sunday: "Dim",
  };
  return windows
    .slice(0, 3)
    .map((w) => `${dayLabels[w.day] || w.day} ${w.start}-${w.end}`)
    .join(" · ") + (windows.length > 3 ? ` +${windows.length - 3}` : "");
}

function CandidateRow({
  candidate: c,
  centres,
  onDelete,
  onMarkServed,
  onEdit,
}: {
  candidate: Candidate;
  centres: Centre[];
  onDelete: () => void;
  onMarkServed: () => void;
  onEdit: () => void;
}) {
  const pres = statusPresentation(c.status);
  const StatusIcon = pres.icon;

  const centreLabels = c.centres_acceptes.length
    ? c.centres_acceptes
        .map((id) => centres.find((ce) => ce.id === id)?.nom)
        .filter(Boolean)
        .join(", ")
    : "Tous centres";

  const dateRange = c.date_min || c.date_max
    ? `${c.date_min ?? "—"} → ${c.date_max ?? "—"}`
    : "Toutes dates";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="rounded-xl bg-card border border-border/50 hover:border-border transition-all"
    >
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary inline-flex items-center justify-center font-bold shrink-0">
            {c.priorite}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-base">
                {c.prenom || "—"} <span className="uppercase">{c.nom}</span>
              </p>
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold", pres.cls)}>
                <StatusIcon className="h-3 w-3" /> {pres.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{maskNeph(c.neph)}</p>
            <div className="text-xs text-muted-foreground mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
              <span>🏛 {centreLabels}</span>
              <span>📅 {dateRange}</span>
              <span>🕐 {formatWindowsSummary(c.availability_windows || [])}</span>
            </div>
            {c.creneau_details && (
              <p className="text-xs mt-1.5 font-medium text-success">
                ✓ {c.creneau_details}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {c.status === "reserved" && (
            <Button size="sm" variant="success" onClick={onMarkServed}>
              Marquer servi
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Modifier" title="Modifier">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Supprimer" title="Supprimer">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="px-5 pb-3 text-[10px] text-muted-foreground">
        Ajouté {formatRelative(c.created_at)}
      </div>
    </motion.div>
  );
}

function CandidateFormModal({
  centres,
  onClose,
  candidate,
  listType,
}: {
  centres: Centre[];
  onClose: () => void;
  candidate?: Candidate;
  listType: CandidateType;
}) {
  const isEdit = !!candidate;
  // En mode édition on n'a pas besoin de re-sélectionner l'élève, on le reconstruit depuis le candidat
  const [student, setStudent] = useState<RdvpermisStudent | null>(
    candidate
      ? {
          candidat_id_plateforme: candidate.candidat_id_plateforme || "",
          neph: candidate.neph,
          nom: candidate.nom,
          prenom: candidate.prenom,
          email: candidate.email || "",
          date_naissance: null,
          mandat_id: null,
          groupe_permis: "B",
          actif: true,
          first_seen_at: "",
          last_synced_at: "",
          // Champs enrichis (non connus en mode édition) — défauts safe
          penalites: null,
          details_resultats: null,
          date_examen_theorique: null,
          date_examen_circulation: null,
          statut_examen_circulation: null,
          nombre_echecs_total: 0,
          nombre_echecs_circulation: 0,
          seuil_critique_atteint: false,
        }
      : null,
  );
  const [priorite, setPriorite] = useState(candidate?.priorite ?? 100);
  const [selectedCentres, setSelectedCentres] = useState<string[]>(
    candidate
      ? (candidate.centres_acceptes.length ? candidate.centres_acceptes : centres.map((c) => c.id))
      : centres.map((c) => c.id),
  );
  const [dateMin, setDateMin] = useState(candidate?.date_min ?? "");
  const [dateMax, setDateMax] = useState(candidate?.date_max ?? "");
  const [windows, setWindows] = useState<AvailabilityWindow[]>(candidate?.availability_windows ?? []);
  const [note, setNote] = useState(candidate?.note ?? "");
  const [submitting, setSubmitting] = useState(false);

  // Plancher effectif du date_min (aujourd'hui + 3 jours ouvrables, saute le dimanche).
  // Recalculé à chaque ouverture du modal pour rester aligné avec le cron Supabase.
  const minEffectiveIso = useMemo(() => toIsoDate(addExamDays(new Date(), 3)), []);

  const allChecked = selectedCentres.length === centres.length;

  function toggleCentre(id: string) {
    setSelectedCentres((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleAll() {
    setSelectedCentres(allChecked ? [] : centres.map((c) => c.id));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!student) {
      toast.error("Sélectionne un élève dans la liste");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const payload = {
      priorite,
      centres_acceptes: allChecked ? [] : selectedCentres,
      availability_windows: windows,
      date_min: dateMin || null,
      date_max: dateMax || null,
      note: note.trim(),
    };

    if (isEdit && candidate) {
      const { error } = await supabase
        .from("candidates")
        .update(payload)
        .eq("id", candidate.id);
      setSubmitting(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(`${candidate.prenom} ${candidate.nom} modifié`);
      onClose();
      return;
    }

    const { error } = await supabase.from("candidates").insert({
      ...payload,
      neph: student.neph,
      nom: student.nom,
      prenom: student.prenom,
      email: student.email,
      status: "waiting",
      type: listType,
      candidat_id_plateforme: student.candidat_id_plateforme,
      rdvpermis_student_id: student.candidat_id_plateforme,
    });

    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${student.prenom} ${student.nom} ajouté à la file d'attente`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-3xl bg-card rounded-2xl border border-border shadow-xl max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-border/60">
          <h2 className="text-xl font-bold">
            {isEdit ? "Modifier le candidat" : "Ajouter un candidat à la file d'attente"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isEdit
              ? "Mets à jour les centres, dates ou horaires — la modification se synchronise instantanément avec le bot."
              : "Sélectionne un élève sous mandat, puis définis ses préférences."}
          </p>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {isEdit ? (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="font-semibold">
                  {student?.prenom} <span className="uppercase">{student?.nom}</span>
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">NEPH {student?.neph}</p>
              </div>
            ) : (
              <div>
                <Label className="mb-2 block">Élève *</Label>
                <StudentAutocomplete value={student} onChange={setStudent} />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Tape le nom, prénom ou NEPH — la liste affiche tes élèves sous mandat AE2B.
                </p>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-sm mb-3">Centres d'examen acceptés</h3>
              <div className="rounded-lg border border-border p-3 max-h-48 overflow-y-auto space-y-0.5">
                <label className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent/10 font-medium border-b border-border pb-2 mb-1">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} className="accent-primary" />
                  <span>Tous les centres</span>
                </label>
                {centres.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent/10 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedCentres.includes(c.id)}
                      onChange={() => toggleCentre(c.id)}
                      className="accent-primary"
                    />
                    <span>{c.nom}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-3">Fenêtres horaires acceptées</h3>
              <AvailabilityWindowsEditor value={windows} onChange={setWindows} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date-min">Pas avant le</Label>
                <Input
                  id="date-min"
                  type="date"
                  min={minEffectiveIso}
                  value={dateMin}
                  onChange={(e) => setDateMin(e.target.value)}
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Plancher auto : <strong>{formatFrenchDate(minEffectiveIso)}</strong> (+3 jours ouvrables, ajusté chaque nuit)
                </p>
              </div>
              <div>
                <Label htmlFor="date-max">Pas après le</Label>
                <Input id="date-max" type="date" value={dateMax} onChange={(e) => setDateMax(e.target.value)} className="mt-1.5" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Non ajusté automatiquement (à modifier manuellement si besoin)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priorite">Priorité (1 = passe en premier)</Label>
                <Input
                  id="priorite"
                  type="number"
                  min={1}
                  max={999}
                  value={priorite}
                  onChange={(e) => setPriorite(parseInt(e.target.value) || 100)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="note">Note (optionnel)</Label>
                <Input id="note" placeholder="Ex: urgent, déjà ajourné 2 fois" value={note} onChange={(e) => setNote(e.target.value)} className="mt-1.5" />
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-border/60 flex gap-2 justify-end bg-card/50 sticky bottom-0">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting || !student}>
              {submitting ? (
                <Loader2 className="animate-spin" />
              ) : isEdit ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isEdit ? "Enregistrer les modifications" : "Ajouter à la file"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
