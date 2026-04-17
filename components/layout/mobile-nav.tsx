"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, UserCheck, Calendar, Settings, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/candidats", label: "Place sup", icon: Users },
  { href: "/candidats-prets-pour-examen", label: "En attente", icon: UserCheck },
  { href: "/reservations", label: "Resa.", icon: Calendar },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/parametres", label: "Réglages", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/90 backdrop-blur border-t border-border/60 pb-safe">
      <div className="grid grid-cols-6 gap-0.5 px-1 pt-2 pb-2">
        {NAV.map((item) => {
          // Match exact ou préfixe + "/" pour éviter que /candidats matche /candidats-prets-pour-examen
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
