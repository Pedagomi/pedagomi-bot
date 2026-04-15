"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ScrollText,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, formatDateTime, formatRelative } from "@/lib/utils";
import type { BotLog } from "./page";

type LevelFilter = "all" | "ERROR" | "WARNING" | "SUCCESS" | "INFO";

export function LogsClient({ initial }: { initial: BotLog[] }) {
  const [logs, setLogs] = useState<BotLog[]>(initial);
  const [filter, setFilter] = useState<LevelFilter>("all");
  const [query, setQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Supabase Realtime — ajoute les nouveaux logs en haut
  useEffect(() => {
    if (!autoRefresh) return;
    const supabase = createClient();
    const ch = supabase
      .channel("bot-logs-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bot_logs" },
        (payload) => {
          setLogs((prev) => [payload.new as BotLog, ...prev].slice(0, 500));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [autoRefresh]);

  const filtered = useMemo(() => {
    let arr = logs;
    if (filter !== "all") arr = arr.filter((l) => l.level === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      arr = arr.filter(
        (l) =>
          l.message.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q),
      );
    }
    return arr;
  }, [logs, filter, query]);

  const counts = useMemo(
    () => ({
      all: logs.length,
      ERROR: logs.filter((l) => l.level === "ERROR").length,
      WARNING: logs.filter((l) => l.level === "WARNING").length,
      SUCCESS: logs.filter((l) => l.level === "SUCCESS").length,
      INFO: logs.filter((l) => l.level === "INFO").length,
    }),
    [logs],
  );

  async function clearLogs() {
    if (!confirm("Effacer tous les logs ? Cette action est définitive.")) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("bot_logs")
      .delete()
      .gt("id", 0);
    if (error) toast.error(error.message);
    else {
      toast.success("Logs effacés");
      setLogs([]);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs du bot</h1>
          <p className="text-muted-foreground mt-1">
            Activité en temps réel du worker — 200 derniers événements
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <span className={cn("h-2 w-2 rounded-full", autoRefresh ? "bg-success animate-pulse" : "bg-muted-foreground")} />
            {autoRefresh ? "Live" : "Pause"}
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs}>
            <Trash2 className="h-4 w-4" /> Effacer
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          <FilterPill label="Tous" count={counts.all} active={filter === "all"} onClick={() => setFilter("all")} color="muted" />
          <FilterPill label="Erreurs" count={counts.ERROR} active={filter === "ERROR"} onClick={() => setFilter("ERROR")} color="destructive" />
          <FilterPill label="Alertes" count={counts.WARNING} active={filter === "WARNING"} onClick={() => setFilter("WARNING")} color="warning" />
          <FilterPill label="Succès" count={counts.SUCCESS} active={filter === "SUCCESS"} onClick={() => setFilter("SUCCESS")} color="success" />
          <FilterPill label="Info" count={counts.INFO} active={filter === "INFO"} onClick={() => setFilter("INFO")} color="primary" />
        </div>
        <div className="relative sm:ml-auto w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans les logs…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              {logs.length === 0
                ? "Aucun log pour l'instant. Le worker y écrira ses événements en temps réel."
                : `Aucun log ne correspond au filtre.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40 max-h-[70vh] overflow-y-auto">
            {filtered.map((l) => (
              <LogRow key={l.id} log={l} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPill({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: "muted" | "destructive" | "warning" | "success" | "primary";
}) {
  const activeCls = {
    muted: "bg-foreground text-background",
    destructive: "bg-destructive text-destructive-foreground",
    warning: "bg-warning text-warning-foreground",
    success: "bg-success text-success-foreground",
    primary: "bg-primary text-primary-foreground",
  }[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
        active ? activeCls : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      {label}
      <span className={cn("tabular-nums px-1.5 rounded", active ? "bg-black/20" : "bg-background")}>
        {count}
      </span>
    </button>
  );
}

function LogRow({ log: l }: { log: BotLog }) {
  const pres = levelPresentation(l.level);
  const Icon = pres.icon;

  return (
    <div className="px-5 py-3 flex items-start gap-3 hover:bg-accent/5">
      <div className={cn("h-8 w-8 rounded-full inline-flex items-center justify-center shrink-0 mt-0.5", pres.cls)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded", pres.badgeCls)}>
            {l.level}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {l.category}
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            <span title={formatDateTime(l.created_at)}>{formatRelative(l.created_at)}</span>
          </span>
        </div>
        <p className="text-sm mt-1 leading-snug">{l.message}</p>
        {l.details && Object.keys(l.details).length > 0 && (
          <details className="mt-1.5 text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Détails
            </summary>
            <pre className="mt-1 p-2 rounded bg-muted/50 text-[11px] overflow-x-auto">
              {JSON.stringify(l.details, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

function levelPresentation(level: string) {
  switch (level) {
    case "ERROR":
      return {
        icon: XCircle,
        cls: "bg-destructive/10 text-destructive",
        badgeCls: "bg-destructive/15 text-destructive",
      };
    case "WARNING":
      return {
        icon: AlertTriangle,
        cls: "bg-warning/10 text-warning",
        badgeCls: "bg-warning/15 text-warning",
      };
    case "SUCCESS":
      return {
        icon: CheckCircle2,
        cls: "bg-success/10 text-success",
        badgeCls: "bg-success/15 text-success",
      };
    default:
      return {
        icon: Info,
        cls: "bg-primary/10 text-primary",
        badgeCls: "bg-primary/15 text-primary",
      };
  }
}
