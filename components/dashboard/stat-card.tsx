import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "destructive" | "accent";
  hint?: string;
}

const TONE: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  destructive: "text-destructive bg-destructive/10",
  accent: "text-accent bg-accent/10",
};

export function StatCard({ label, value, icon: Icon, tone = "default", hint }: StatCardProps) {
  return (
    <div className="rounded-xl bg-card border border-border/50 p-5 transition-all hover:border-border hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("shrink-0 h-10 w-10 rounded-lg inline-flex items-center justify-center", TONE[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
