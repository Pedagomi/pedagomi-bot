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
  Edit3,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn, maskNeph, formatRelative } from "@/lib/utils";
import type { Candidate, Centre, CandidateStatus, HorairePrefere } from "@/lib/supabase/types";

interface Props {
  initial: Candidate[];
  centres: Centre[];
}

export function CandidatesClient({ initial, centres }: Props) {
  const [candidates, setCandidates] = useState<Candidate[]>(initial);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState<CandidateStatus | "all">("all");

  // Realtime sync
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel("candidates-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "candidates" },
        async () => {
          const { data } = await supabase
            .from("candidates")
            .select("*")
            .order("priorite")
            .order("created_at");
          if (data) setCandidates(data as Candidate[]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

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

  const counts = useMemo(() => {
    return {
      all: candidates.length,
      waiting: candidates.filter((c) => c.status === "waiting").length,
      reserved: candidates.filter((c) => c.status === "reserved").length,
      served: candidates.filter((c) => c.status === "served").length,
      failed: candidates.filter((c) => c.status === "failed").length,
    };
  }, [candidates]);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Candidats en attente</h1>
          <p className="text-muted-foreground mt-1">
            Le bot attribue les places au candidat le plus prioritaire dont les préférences matchent.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Ajouter un candidat
        </Button>
      </div>

      {/* Filtres + recherche */}
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

      {/* Liste */}
      {filtered.length === 0 ? (
        <EmptyState onCreate={() => setFormOpen(true)} />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <CandidateRow
              key={c.id}
              candidate={c}
              centres={centres}
              onDelete={() => removeCandidate(c.id)}
              onMarkServed={() => markAsServed(c.id)}
            />
          ))}
        </div>
      )}

      {/* Drawer formulaire */}
      <AnimatePresence>
        {formOpen && (
          <CandidateFormModal
            centres={centres}
            onClose={() => setFormOpen(false)}
          />
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

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border py-16 px-6 text-center">
      <div className="h-14 w-14 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
        <Plus className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-semibold">Aucun candidat dans la file</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Ajoute tes élèves avec leur NEPH et préférences. Le bot réservera automatiquement.
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

function CandidateRow({
  candidate: c,
  centres,
  onDelete,
  onMarkServed,
}: {
  candidate: Candidate;
  centres: Centre[];
  onDelete: () => void;
  onMarkServed: () => void;
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
              {c.horaire_prefere && (
                <span>🕐 {c.horaire_prefere === "matin" ? "Matin" : "Après-midi"}</span>
              )}
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
          <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Supprimer">
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

function CandidateFormModal({ centres, onClose }: { centres: Centre[]; onClose: () => void }) {
  const [neph, setNeph] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [priorite, setPriorite] = useState(100);
  const [selectedCentres, setSelectedCentres] = useState<string[]>(centres.map((c) => c.id));
  const [dateMin, setDateMin] = useState("");
  const [dateMax, setDateMax] = useState("");
  const [horaire, setHoraire] = useState<HorairePrefere | "">("");
  const [note, setNote] = useState("");
  const [nephCheck, setNephCheck] = useState<{ status: "idle" | "loading" | "ok" | "ko"; msg?: string }>({ status: "idle" });
  const [submitting, setSubmitting] = useState(false);

  const allChecked = selectedCentres.length === centres.length;

  function toggleCentre(id: string) {
    setSelectedCentres((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleAll() {
    setSelectedCentres(allChecked ? [] : centres.map((c) => c.id));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleanNeph = neph.replace(/\s/g, "");
    if (!/^\d{10,15}$/.test(cleanNeph)) {
      toast.error("NEPH invalide (10-15 chiffres)");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("candidates").insert({
      neph: cleanNeph,
      nom: nom.trim().toUpperCase(),
      prenom: prenom.trim(),
      priorite,
      centres_acceptes: allChecked ? [] : selectedCentres,
      date_min: dateMin || null,
      date_max: dateMax || null,
      horaire_prefere: horaire || null,
      note: note.trim(),
      status: "waiting",
    });

    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Candidat ajouté");
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
        className="relative w-full max-w-2xl bg-card rounded-2xl border border-border shadow-xl max-h-[calc(100vh-3rem)] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-border/60">
          <h2 className="text-xl font-bold">Ajouter un candidat</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Le bot cherchera une place matchant les préférences dès qu'elles apparaissent.
          </p>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Identité */}
            <div>
              <Label htmlFor="neph">Numéro NEPH *</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  id="neph"
                  placeholder="240575101079"
                  value={neph}
                  onChange={(e) => {
                    setNeph(e.target.value);
                    setNephCheck({ status: "idle" });
                  }}
                  required
                  className="flex-1"
                />
              </div>
              {nephCheck.status === "ok" && (
                <p className="text-xs text-success mt-1.5">✓ {nephCheck.msg}</p>
              )}
              {nephCheck.status === "ko" && (
                <p className="text-xs text-destructive mt-1.5">✗ {nephCheck.msg}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nom">Nom</Label>
                <Input id="nom" placeholder="DUPONT" value={nom} onChange={(e) => setNom(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="prenom">Prénom</Label>
                <Input id="prenom" placeholder="Jean" value={prenom} onChange={(e) => setPrenom(e.target.value)} className="mt-1.5" />
              </div>
            </div>

            {/* Préférences */}
            <div className="pt-2">
              <h3 className="font-semibold text-sm mb-3">Préférences de réservation</h3>

              <div className="space-y-4">
                <div>
                  <Label>Centres acceptés</Label>
                  <div className="mt-1.5 rounded-lg border border-border p-3 max-h-56 overflow-y-auto space-y-0.5">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date-min">Pas avant le</Label>
                    <Input id="date-min" type="date" value={dateMin} onChange={(e) => setDateMin(e.target.value)} className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="date-max">Pas après le</Label>
                    <Input id="date-max" type="date" value={dateMax} onChange={(e) => setDateMax(e.target.value)} className="mt-1.5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="horaire">Horaire préféré</Label>
                    <select
                      id="horaire"
                      value={horaire}
                      onChange={(e) => setHoraire(e.target.value as HorairePrefere | "")}
                      className="mt-1.5 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Peu importe</option>
                      <option value="matin">Matin (avant 12h)</option>
                      <option value="apres-midi">Après-midi (12h-18h)</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="priorite">Priorité</Label>
                    <Input
                      id="priorite"
                      type="number"
                      min={1}
                      max={999}
                      value={priorite}
                      onChange={(e) => setPriorite(parseInt(e.target.value) || 100)}
                      className="mt-1.5"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">1 = passe en premier</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="note">Note (optionnel)</Label>
                  <Input
                    id="note"
                    placeholder="Ex: déjà ajourné 2 fois"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-border/60 flex gap-2 justify-end bg-card/50 sticky bottom-0">
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : <Plus className="h-4 w-4" />}
              Ajouter à la file
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
