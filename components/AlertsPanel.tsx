"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ApiEnvelope } from "@/types";
import { AlertEvent, AlertRule, AlertRuleType } from "@/types/features";
import { Bell, BellRing, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/** Simple WebAudio beep — no audio file needed. */
function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    /* audio blocked until user interacts — fine */
  }
}

export function AlertsPanel({ defaultSymbol = "AAPL" }: { defaultSymbol?: string }) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [flash, setFlash] = useState(false);
  const [draft, setDraft] = useState<{
    type: AlertRuleType; symbol: string; minPremium: string; priceLevel: string;
    direction: "ABOVE" | "BELOW"; orderType: "SWEEP" | "BLOCK" | "SPLIT"; audio: boolean;
  }>({
    type: "SWEEP_PREMIUM", symbol: defaultSymbol, minPremium: "1000000",
    priceLevel: "", direction: "ABOVE", orderType: "SWEEP", audio: true,
  });

  const knownEventIds = useRef(new Set<string>());

  const poll = useCallback(async () => {
    const res = await fetch("/api/alerts?check=1");
    const json = (await res.json()) as ApiEnvelope<{
      rules: AlertRule[]; events: AlertEvent[]; fired: AlertEvent[];
    }>;
    if (!json.ok || !json.data) return;
    setRules(json.data.rules);
    setEvents(json.data.events);
    const fresh = json.data.fired.filter((f) => !knownEventIds.current.has(f.id));
    fresh.forEach((f) => knownEventIds.current.add(f.id));
    if (fresh.length) {
      setFlash(true);
      setTimeout(() => setFlash(false), 1500);
      if (fresh.some((f) => f.audio)) beep();
    }
  }, []);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 15_000);
    return () => clearInterval(t);
  }, [poll]);

  const addRule = async () => {
    const rule: Omit<AlertRule, "id" | "createdAt"> = {
      type: draft.type,
      symbol: draft.symbol.toUpperCase(),
      audio: draft.audio,
      ...(draft.type === "SWEEP_PREMIUM" || draft.type === "BLOCK_PREMIUM"
        ? { minPremium: Number(draft.minPremium) || 0 }
        : {}),
      ...(draft.type === "PRICE_LEVEL"
        ? { priceLevel: Number(draft.priceLevel) || 0, direction: draft.direction }
        : {}),
      ...(draft.type === "ORDER_TYPE" ? { orderType: draft.orderType } : {}),
    };
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rule }),
    });
    const json = (await res.json()) as ApiEnvelope<{ rules: AlertRule[] }>;
    if (json.ok && json.data) setRules(json.data.rules);
  };

  const removeRule = async (id: string) => {
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteId: id }),
    });
    const json = (await res.json()) as ApiEnvelope<{ rules: AlertRule[] }>;
    if (json.ok && json.data) setRules(json.data.rules);
  };

  return (
    <Card className={`card-3d transition-all ${flash ? "card-3d-gold ring-2 ring-primary" : ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className="headline text-sm flex items-center gap-2">
          {flash ? (
            <BellRing className="h-4 w-4 text-primary animate-bounce" />
          ) : (
            <Bell className="h-4 w-4 text-primary" />
          )}
          Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rule builder */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Type</Label>
            <Select
              value={draft.type}
              onValueChange={(v) => setDraft((d) => ({ ...d, type: v as AlertRuleType }))}
            >
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SWEEP_PREMIUM">Sweep ≥ premium</SelectItem>
                <SelectItem value="BLOCK_PREMIUM">Block ≥ premium</SelectItem>
                <SelectItem value="SENTIMENT_CHANGE">Sentiment change</SelectItem>
                <SelectItem value="PRICE_LEVEL">Price level cross</SelectItem>
                <SelectItem value="ORDER_TYPE">Any order type</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Symbol</Label>
            <Input className="h-8 w-20 text-xs tabular" value={draft.symbol}
              onChange={(e) => setDraft((d) => ({ ...d, symbol: e.target.value.toUpperCase() }))} />
          </div>
          {(draft.type === "SWEEP_PREMIUM" || draft.type === "BLOCK_PREMIUM") && (
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Min premium $</Label>
              <Input type="number" className="h-8 w-28 text-xs tabular" value={draft.minPremium}
                onChange={(e) => setDraft((d) => ({ ...d, minPremium: e.target.value }))} />
            </div>
          )}
          {draft.type === "PRICE_LEVEL" && (
            <>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Level $</Label>
                <Input type="number" className="h-8 w-24 text-xs tabular" value={draft.priceLevel}
                  onChange={(e) => setDraft((d) => ({ ...d, priceLevel: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Direction</Label>
                <Select value={draft.direction}
                  onValueChange={(v) => setDraft((d) => ({ ...d, direction: v as "ABOVE" | "BELOW" }))}>
                  <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABOVE">Above</SelectItem>
                    <SelectItem value="BELOW">Below</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {draft.type === "ORDER_TYPE" && (
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Order type</Label>
              <Select value={draft.orderType}
                onValueChange={(v) => setDraft((d) => ({ ...d, orderType: v as typeof draft.orderType }))}>
                <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SWEEP">Sweep</SelectItem>
                  <SelectItem value="BLOCK">Block</SelectItem>
                  <SelectItem value="SPLIT">Split</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button size="sm" variant="outline" className="h-8 text-xs"
            onClick={() => setDraft((d) => ({ ...d, audio: !d.audio }))}>
            🔊 {draft.audio ? "On" : "Off"}
          </Button>
          <Button size="sm" className="h-8 text-xs font-bold" onClick={addRule}>
            Add Alert
          </Button>
        </div>

        {/* Active rules */}
        {rules.length > 0 && (
          <div className="space-y-1">
            <h4 className="headline text-[10px] text-muted-foreground">Active Rules</h4>
            {rules.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded bg-muted/30 px-3 py-1.5 text-[11px]">
                <span>
                  <Badge variant="outline" className="mr-2 border-primary/40 text-[9px]">
                    {r.type.replace(/_/g, " ")}
                  </Badge>
                  {r.symbol}
                  {r.minPremium ? ` ≥ $${(r.minPremium / 1e6).toFixed(1)}M` : ""}
                  {r.priceLevel ? ` ${r.direction?.toLowerCase()} $${r.priceLevel}` : ""}
                  {r.orderType ? ` ${r.orderType}` : ""}
                  {r.audio ? " · 🔊" : ""}
                </span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-400"
                  onClick={() => removeRule(r.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Triggered */}
        {events.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <h4 className="headline text-[10px] text-muted-foreground">Triggered</h4>
            {events.slice(0, 10).map((e) => (
              <div key={e.id} className="rounded bg-primary/10 px-3 py-1.5 text-[11px]">
                <span className="font-semibold gold-text">{e.symbol}</span> — {e.message}
                <span className="ml-2 text-muted-foreground">
                  {new Date(e.at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
