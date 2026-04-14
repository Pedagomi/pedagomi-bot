"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/toggle";
import { createClient } from "@/lib/supabase/client";

export function MobileHeader() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-card/90 backdrop-blur border-b border-border/60">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="inline-flex items-center gap-2">
          <Logo size={30} />
          <span className="font-semibold">Pedagomi Bot</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Déconnexion">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
