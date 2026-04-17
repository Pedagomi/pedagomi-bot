"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, UserCheck, Calendar, Settings, LogOut, ScrollText } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/toggle";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/candidats", label: "Place sup", icon: Users },
  { href: "/candidats-prets-pour-examen", label: "Candidats en attente", icon: UserCheck },
  { href: "/reservations", label: "Réservations", icon: Calendar },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/parametres", label: "Paramètres", icon: Settings },
];

export function Sidebar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden lg:flex lg:flex-col fixed inset-y-0 left-0 w-64 bg-card border-r border-border/60">
      <div className="px-6 py-5 border-b border-border/60">
        <Link href="/" className="inline-flex items-center gap-3">
          <Logo size={36} />
          <div className="leading-tight">
            <div className="font-bold text-sm">Pedagomi Bot</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              AE2B Paris
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          // Match exact ou préfixe + "/" pour éviter que /candidats matche /candidats-prets-pour-examen
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href + "/"));
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/10",
                )}
              >
                {active && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-primary rounded-r-full"
                  />
                )}
                <item.icon className="h-4 w-4" />
                {item.label}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-xs font-medium truncate">{userEmail || "—"}</p>
            <p className="text-[10px] text-muted-foreground">Connecté</p>
          </div>
          <ThemeToggle />
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </aside>
  );
}
