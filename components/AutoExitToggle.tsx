"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiEnvelope } from "@/types";
import { AutoExitConfig, AutoExitEvent } from "@/types/features";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function AutoExitToggle({ onTradeClosed }: { onTradeClosed?: () => void }) {
  const [config, setConfig] = useState<AutoExitConfig | null>(null);
  const [events, setEvents] = useState<AutoExitEvent[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/auto-exit");
    const json = (await res.json()) as ApiEnvelope<{ config: AutoExitConfig; events: AutoExitEvent[] }>;
    if (json.ok && json.data) {
      setConfig(json.data.config);
      setEvents(json.data.events);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // "Background engine": poll a sweep every 30s while enabled.
  useEffect(() => {
    if (!config?.enabled) return;
    const t = setInterval(async () => {
      const res = await fetch("/api/auto-exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run: true }),
      });
      const json = (await res.json()) as ApiEnvelope<{ fired: AutoExitEvent[] }>;
      if (json.ok && json.data && json.data.fired.length) {
        setEvents((prev) => [...json.data!.fired, ...prev].slice(0, 50));
        onTradeClosed?.();
      }
    }, 30_000);
    return () => clearInterval(t);
  }, [config?.enabled, onTradeClosed]);

  const update = async (patch: Partial<AutoExitConfig>) => {
    const res = await fetch("/api/auto-exit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: patch }),
    });
    const json = (await res.json()) as ApiEnvelope<{ config: AutoExitConfig }>;
    if (json.ok && json.data) setConfig(json.data.config);
  };

  if (!config) return null;

  const num = (key: keyof AutoExitConfig, label: string, step = 1) => (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input
        type="number"
        step={step}
        value={String(config[key])}
        className="h-8 w-24 text-xs tabular"
        onChange={(e) => update({ [key]: Number(e.target.value) } as Partial<AutoExitConfig>)}
      />
    </div>
  );

  return (
    <Card className={`card-3d ${config.enabled ? "card-3d-gold" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="headline text-sm flex items-center gap-2">
            {config.enabled ? (
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            ) : (
              <ShieldOff className="h-4 w-4 text-muted-foreground" />
            )}
            Auto-Exit Bot
            <Badge
              variant="secondary"
              className={`text-[9px] ${config.enabled ? "bg-emerald-500/20 text-emerald-400" : ""}`}
            >
              {config.enabled ? "ARMED" : "OFF"}
            </Badge>
          </CardTitle>
          <Button
            size="sm"
            variant={config.enabled ? "destructive" : "default"}
            className="h-8 text-xs font-bold"
            onClick={() => update({ enabled: !config.enabled })}
          >
            {config.enabled ? "Disarm" : "Arm Bot"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3">
          {num("profitTargetPct", "Profit target %")}
          {num("stopLossMultiple", "Stop loss ×premium", 0.5)}
          {num("maxAbsDelta", "Max |delta|", 0.05)}
          {num("exitDTE", "Exit at DTE ≤")}
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">RiskManager EXIT NOW</Label>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-24 text-xs"
              onClick={() => update({ respectRiskManager: !config.respectRiskManager })}
            >
              {config.respectRiskManager ? "Honored" : "Ignored"}
            </Button>
          </div>
        </div>
        {events.length > 0 && (
          <div className="space-y-1">
            <h4 className="headline text-[10px] text-muted-foreground">Bot Actions</h4>
            {events.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded bg-muted/30 px-3 py-1.5 text-[11px]">
                <span>
                  <Badge variant="outline" className="mr-2 border-primary/40 text-[9px]">
                    {e.reason.replace(/_/g, " ")}
                  </Badge>
                  {e.contract} — {e.detail}
                </span>
                <span className={`font-bold tabular ${e.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  ${e.pnl.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-muted-foreground/70">
          Sweeps run every 30s while armed (browser open). Point a Vercel Cron at POST /api/auto-exit for always-on.
        </p>
      </CardContent>
    </Card>
  );
}
