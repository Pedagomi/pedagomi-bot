"use client";

import { Plus, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AvailabilityWindow, DayOfWeek } from "@/lib/supabase/types";

const DAYS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: "monday", label: "Lundi", short: "Lun" },
  { value: "tuesday", label: "Mardi", short: "Mar" },
  { value: "wednesday", label: "Mercredi", short: "Mer" },
  { value: "thursday", label: "Jeudi", short: "Jeu" },
  { value: "friday", label: "Vendredi", short: "Ven" },
  { value: "saturday", label: "Samedi", short: "Sam" },
];

interface Props {
  value: AvailabilityWindow[];
  onChange: (windows: AvailabilityWindow[]) => void;
}

export function AvailabilityWindowsEditor({ value, onChange }: Props) {
  function addWindow() {
    onChange([...value, { day: "monday", start: "08:00", end: "18:00" }]);
  }

  function updateWindow(index: number, patch: Partial<AvailabilityWindow>) {
    const next = [...value];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function removeWindow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function addQuickPreset(preset: "all-weekdays" | "mornings" | "afternoons") {
    let newWindows: AvailabilityWindow[] = [];
    if (preset === "all-weekdays") {
      newWindows = DAYS.slice(0, 5).map((d) => ({
        day: d.value,
        start: "08:00",
        end: "18:00",
      }));
    } else if (preset === "mornings") {
      newWindows = DAYS.slice(0, 5).map((d) => ({
        day: d.value,
        start: "08:00",
        end: "12:00",
      }));
    } else if (preset === "afternoons") {
      newWindows = DAYS.slice(0, 5).map((d) => ({
        day: d.value,
        start: "13:00",
        end: "18:00",
      }));
    }
    onChange([...value, ...newWindows]);
  }

  return (
    <div className="space-y-3">
      {value.length > 0 ? (
        <div className="space-y-2">
          {value.map((w, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-border bg-card p-2"
            >
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <select
                value={w.day}
                onChange={(e) => updateWindow(i, { day: e.target.value as DayOfWeek })}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <span className="text-sm text-muted-foreground">de</span>
              <input
                type="time"
                value={w.start}
                onChange={(e) => updateWindow(i, { start: e.target.value })}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm w-28"
              />
              <span className="text-sm text-muted-foreground">à</span>
              <input
                type="time"
                value={w.end}
                onChange={(e) => updateWindow(i, { end: e.target.value })}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm w-28"
              />
              <button
                type="button"
                onClick={() => removeWindow(i)}
                className="ml-auto text-muted-foreground hover:text-destructive transition-colors p-1"
                aria-label="Supprimer cette fenêtre"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Aucune fenêtre horaire définie. Le bot prendra n'importe quelle heure.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={addWindow} size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Ajouter une fenêtre
        </Button>
        <Button type="button" onClick={() => addQuickPreset("all-weekdays")} size="sm" variant="ghost">
          + Semaine entière (8h-18h)
        </Button>
        <Button type="button" onClick={() => addQuickPreset("mornings")} size="sm" variant="ghost">
          + Matins (8h-12h)
        </Button>
        <Button type="button" onClick={() => addQuickPreset("afternoons")} size="sm" variant="ghost">
          + Après-midis (13h-18h)
        </Button>
      </div>
    </div>
  );
}
