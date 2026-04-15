"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Search, User, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { RdvpermisStudent } from "@/lib/supabase/types";

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

  // Charger les étudiants au montage (stockés localement ensuite pour le filtrage rapide)
  useEffect(() => {
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("rdvpermis_students")
        .select("*")
        .eq("actif", true)
        .order("nom")
        .limit(2000);
      setStudents((data as RdvpermisStudent[]) ?? []);
      setLoading(false);
    })();
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

      {value && (
        <div className="mt-2 rounded-lg bg-success/10 border border-success/30 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-success">
            <Check className="h-3 w-3" />
            <span className="font-semibold">{value.prenom} {value.nom}</span>
          </div>
          <div className="mt-1 space-y-0.5 text-muted-foreground">
            <div>NEPH : <code className="font-mono">{value.neph}</code></div>
            {value.email && <div>{value.email}</div>}
          </div>
        </div>
      )}

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
              {filtered.map((s) => (
                <button
                  key={s.candidat_id_plateforme}
                  type="button"
                  onClick={() => selectStudent(s)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/10 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary inline-flex items-center justify-center shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {s.prenom} <span className="uppercase">{s.nom}</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {s.neph}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
