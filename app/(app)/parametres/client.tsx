"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Save, Eye, EyeOff, Lock, Bell, Zap,
  CheckCircle2, XCircle, RefreshCw, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { AppSettings, BotState } from "@/lib/supabase/types";

export function SettingsClient({ initial }: { initial: AppSettings | null }) {
  const [settings, setSettings] = useState<Partial<AppSettings>>(
    initial ?? {
      rdv_username: "",
      rdv_password: "",
      scan_interval_seconds: 30,
      scan_active_hours: "00:00-23:59",
      max_slots_per_session: 3,
      notify_email: "",
      notify_on_success: true,
      notify_on_error: true,
      stealth_mode: false,
    },
  );
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [botState, setBotState] = useState<BotState | null>(null);

  // Subscribe to bot_state pour afficher le résultat du test connexion
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("bot_state")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => data && setBotState(data as BotState));

    const ch = supabase
      .channel("parametres-bot-state")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bot_state" },
        (payload) => setBotState(payload.new as BotState),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  async function testConnection() {
    const supabase = createClient();
    toast.info("Test de connexion lancé, résultat dans quelques secondes...");
    await supabase
      .from("bot_state")
      .update({
        connection_test_requested: true,
        connection_test_status: "testing",
        connection_test_message: null,
      })
      .eq("id", 1);
  }

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("app_settings").update(settings).eq("id", 1);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Paramètres enregistrés");
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground mt-1">
          Configuration de la connexion RdvPermis et du comportement du bot
        </p>
      </div>

      {/* Connexion RdvPermis */}
      <section className="rounded-xl bg-card border border-border/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary inline-flex items-center justify-center">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Connexion RdvPermis</h2>
            <p className="text-sm text-muted-foreground">
              Identifiants pro.permisdeconduire.gouv.fr
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="rdv-user">Identifiant</Label>
            <Input
              id="rdv-user"
              type="text"
              value={settings.rdv_username ?? ""}
              onChange={(e) => update("rdv_username", e.target.value)}
              placeholder="votre-email@auto-ecole.fr"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="rdv-pass">Mot de passe</Label>
            <div className="relative mt-1.5">
              <Input
                id="rdv-pass"
                type={showPass ? "text" : "password"}
                value={settings.rdv_password ?? ""}
                onChange={(e) => update("rdv_password", e.target.value)}
                placeholder="••••••••"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-muted text-muted-foreground"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Note : le worker réutilise les cookies de ta session Chrome. Ces identifiants
              servent uniquement si tu veux un login automatique plus tard.
            </p>
          </div>

          {/* Bouton Test Connexion + résultat */}
          <div className="pt-2 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Tester la connexion</p>
                <p className="text-xs text-muted-foreground">
                  Vérifie que les cookies Chrome du worker permettent d'accéder à RdvPermis.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={testConnection}
                disabled={botState?.connection_test_status === "testing"}
              >
                {botState?.connection_test_status === "testing" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Test en cours…</>
                ) : (
                  <><RefreshCw className="h-4 w-4" /> Tester</>
                )}
              </Button>
            </div>

            {botState?.connection_test_status === "ok" && (
              <div className="mt-3 rounded-lg bg-success/10 border border-success/30 px-3 py-2 text-sm text-success flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>{botState.connection_test_message || "Connexion RdvPermis valide"}</span>
              </div>
            )}
            {botState?.connection_test_status === "ko" && (
              <div className="mt-3 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive flex items-start gap-2">
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{botState.connection_test_message || "Connexion invalide"}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Comportement du bot */}
      <section className="rounded-xl bg-card border border-border/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-accent/10 text-accent inline-flex items-center justify-center">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Comportement du bot</h2>
            <p className="text-sm text-muted-foreground">Vitesse et mode de surveillance</p>
          </div>
        </div>
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="interval">Intervalle de scan (secondes)</Label>
              <Input
                id="interval"
                type="number"
                min={5}
                max={600}
                value={settings.scan_interval_seconds ?? 30}
                onChange={(e) => update("scan_interval_seconds", parseInt(e.target.value) || 30)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Plus bas = plus rapide. Min conseillé : 10s
              </p>
            </div>
            <div>
              <Label htmlFor="hours">Heures actives</Label>
              <Input
                id="hours"
                type="text"
                placeholder="00:00-23:59"
                value={settings.scan_active_hours ?? "00:00-23:59"}
                onChange={(e) => update("scan_active_hours", e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format HH:MM-HH:MM. 24/7 par défaut.
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="max-slots">Places max par session</Label>
            <Input
              id="max-slots"
              type="number"
              min={1}
              max={20}
              value={settings.max_slots_per_session ?? 3}
              onChange={(e) => update("max_slots_per_session", parseInt(e.target.value) || 3)}
              className="mt-1.5 w-full sm:w-32"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Plafond de sécurité — le bot s'arrête après ce nombre de réservations consécutives.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
            <div>
              <Label htmlFor="stealth" className="cursor-pointer">Mode furtif</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ralentit volontairement le bot (jitter +500ms, scan moins fréquent) pour paraître plus humain.
                <br />Par défaut désactivé = vitesse MAX.
              </p>
            </div>
            <Switch
              id="stealth"
              checked={settings.stealth_mode ?? false}
              onCheckedChange={(v) => update("stealth_mode", v)}
            />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="rounded-xl bg-card border border-border/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-warning/10 text-warning inline-flex items-center justify-center">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Notifications</h2>
            <p className="text-sm text-muted-foreground">Emails envoyés à chaque événement</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="email-notif">Adresse email de notification</Label>
            <Input
              id="email-notif"
              type="email"
              placeholder="info@pedagomi.com"
              value={settings.notify_email ?? ""}
              onChange={(e) => update("notify_email", e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
            <div>
              <Label htmlFor="notif-success" className="cursor-pointer">Notifier les réservations réussies</Label>
            </div>
            <Switch
              id="notif-success"
              checked={settings.notify_on_success ?? true}
              onCheckedChange={(v) => update("notify_on_success", v)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
            <div>
              <Label htmlFor="notif-error" className="cursor-pointer">Notifier les erreurs</Label>
            </div>
            <Switch
              id="notif-error"
              checked={settings.notify_on_error ?? true}
              onCheckedChange={(v) => update("notify_on_error", v)}
            />
          </div>
        </div>
      </section>

      <div className="sticky bottom-24 lg:bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" className="shadow-lg">
          {saving ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
