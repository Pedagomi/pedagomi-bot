"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, UserPlus, CheckCircle2, XCircle, Clock, RotateCw, Info } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MandateRequest } from "@/lib/supabase/types";
import { formatRelative } from "@/lib/utils";

interface Props {
  onClose: () => void;
}

export function MandateTakerModal({ onClose }: Props) {
  const [nom, setNom] = useState("");
  const [neph, setNeph] = useState("");
  const [groupe, setGroupe] = useState<"A" | "B">("B");
  const [email, setEmail] = useState("");
  const [prenom, setPrenom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<MandateRequest[]>([]);

  // Charger les 20 dernières demandes et écouter les updates
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("mandate_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => data && setRequests(data as MandateRequest[]));

    const ch = supabase
      .channel("mandate-requests-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mandate_requests" },
        async () => {
          const { data } = await supabase
            .from("mandate_requests")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20);
          if (data) setRequests(data as MandateRequest[]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) {
      toast.error("Nom obligatoire");
      return;
    }
    if (!/^\d{9,14}([- ]?\d{3})?$/.test(neph.trim().replace(/\s/g, ""))) {
      toast.error("NEPH invalide");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("mandate_requests").insert({
      nom: nom.trim().toUpperCase(),
      prenom: prenom.trim() || null,
      neph: neph.trim(),
      groupe_permis: groupe,
      email: email.trim() || null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Demande envoyée — le worker prend l'élève sous mandat");
    setNom("");
    setPrenom("");
    setNeph("");
    setEmail("");
  }

  async function retry(req: MandateRequest) {
    const supabase = createClient();
    const { error } = await supabase
      .from("mandate_requests")
      .update({ status: "pending", error_message: null })
      .eq("id", req.id);
    if (error) toast.error(error.message);
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
          <h2 className="text-xl font-bold">Prendre un élève sous mandat</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Saisis le nom et le NEPH. Le bot appelle RdvPermis pour créer le mandat.
            Une fois réussi, l'élève apparaît automatiquement dans "Ajouter un candidat".
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form onSubmit={submit} className="p-6 space-y-4 border-b border-border/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nom">Nom de famille *</Label>
                <Input
                  id="nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="DUPONT"
                  required
                  className="mt-1.5 uppercase"
                />
              </div>
              <div>
                <Label htmlFor="prenom">Prénom (optionnel)</Label>
                <Input
                  id="prenom"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Utilisé uniquement pour l'affichage"
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="neph">Numéro de dossier (NEPH) *</Label>
                <Input
                  id="neph"
                  value={neph}
                  onChange={(e) => setNeph(e.target.value.replace(/\s/g, ""))}
                  placeholder="123456789-123"
                  inputMode="numeric"
                  required
                  className="mt-1.5 font-mono"
                />
              </div>
              <div>
                <Label htmlFor="groupe">Groupe de permis *</Label>
                <select
                  id="groupe"
                  value={groupe}
                  onChange={(e) => setGroupe(e.target.value as "A" | "B")}
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="B">Permis B (voiture)</option>
                  <option value="A">Permis A (moto)</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email (optionnel)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="eleve@exemple.com"
                className="mt-1.5"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Lancer la prise sous mandat
              </Button>
            </div>
          </form>

          <div className="p-6">
            <h3 className="font-semibold text-sm mb-3">Dernières demandes</h3>
            {requests.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-6 border border-dashed border-border rounded-lg">
                Aucune demande pour l'instant.
              </div>
            ) : (
              <div className="space-y-2">
                {requests.map((r) => (
                  <MandateRow key={r.id} request={r} onRetry={() => retry(r)} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border/60 flex justify-end bg-card/50">
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        </div>
      </motion.div>
    </div>
  );
}

function MandateRow({ request: r, onRetry }: { request: MandateRequest; onRetry: () => void }) {
  const pres = statusPresentation(r.status);
  const Icon = pres.icon;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-3 py-2.5">
      <div className={`h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0 ${pres.cls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {r.prenom ? `${r.prenom} ` : ""}
          <span className="uppercase">{r.nom}</span>
          <span className="font-mono text-xs text-muted-foreground ml-2">{r.neph}</span>
          <span className="text-xs text-muted-foreground ml-2">· Permis {r.groupe_permis}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {pres.label} · {formatRelative(r.created_at)}
          {r.error_message && (
            <span className={r.status === "already" ? "text-warning" : "text-destructive"}>
              {" "}— {r.error_message.slice(0, 140)}
            </span>
          )}
        </p>
      </div>
      {r.status === "error" && (
        <Button size="sm" variant="ghost" onClick={onRetry} title="Réessayer">
          <RotateCw className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function statusPresentation(status: MandateRequest["status"]) {
  switch (status) {
    case "pending":
      return { icon: Clock, label: "En attente du worker", cls: "bg-muted text-muted-foreground" };
    case "processing":
      return { icon: Loader2, label: "Traitement en cours…", cls: "bg-primary/10 text-primary animate-pulse" };
    case "success":
      return { icon: CheckCircle2, label: "Pris sous mandat ✓", cls: "bg-success/15 text-success" };
    case "already":
      return { icon: Info, label: "Déjà sous mandat", cls: "bg-warning/15 text-warning" };
    case "error":
      return { icon: XCircle, label: "Échec", cls: "bg-destructive/15 text-destructive" };
  }
}
