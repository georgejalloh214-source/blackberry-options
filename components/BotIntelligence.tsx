"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiEnvelope } from "@/types";
import { BotOutput } from "@/lib/bot/brain";
import { BrainCircuit, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

const qualityLabel: Record<BotOutput["quality"], string> = {
  high: "High-quality setup",
  medium: "Medium-quality setup",
  low: "Low-quality setup",
  bad: "Avoid this trade",
};

const qualityClass: Record<BotOutput["quality"], string> = {
  high: "bg-emerald-500/20 text-emerald-400",
  medium: "bg-primary/20 text-primary",
  low: "bg-orange-500/20 text-orange-300",
  bad: "bg-red-500/20 text-red-400",
};

export function BotIntelligence({ inputs }: { inputs: BotOutput["inputs"] }) {
  const [result, setResult] = useState<BotOutput | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/bot/brain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputs),
    })
      .then((response) => response.json() as Promise<ApiEnvelope<BotOutput>>)
      .then((payload) => {
        if (active && payload.ok && payload.data) setResult(payload.data);
      })
      .catch(() => {
        if (active) setResult(null);
      });
    return () => { active = false; };
  }, [inputs]);

  return (
    <Card className="card-3d card-3d-gold">
      <CardHeader className="pb-3">
        <CardTitle className="headline flex items-center gap-2 text-sm">
          <BrainCircuit className="h-4 w-4 text-primary" /> Bot Intelligence
          <Badge variant="outline" className="ml-auto border-primary/30 text-[9px]">Decision support</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!result ? <p className="text-xs text-muted-foreground">Reading trend, flow, IV, Greeks, and risk...</p> : (
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold tabular text-amber-300/70">{result.tradeScore}</span>
              <span className="pb-1 text-sm text-muted-foreground">/ 100 · {qualityLabel[result.quality]}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-5">
              {Object.entries(result.inputs).map(([key, value]) => (
                <div key={key} className="rounded bg-muted/30 p-2 text-center">
                  <p className="truncate text-[9px] uppercase tracking-wider text-muted-foreground">{key.replace("Score", "")}</p>
                  <p className="font-bold tabular">{Math.round(value)}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Suggested path: <strong className="text-primary">{result.recommendedStrategy}</strong></span>
            </div>
            <p className="inline-flex rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300">
              ⚠ SAMPLE SIGNAL
            </p>
            <p className="text-[10px] text-amber-200/80">This signal uses simulated market-flow data and should not be treated as trading evidence.</p>
            <p className={`inline-flex rounded px-2 py-1 text-[10px] font-semibold opacity-70 ${qualityClass[result.quality]}`}>
              {result.quality === "bad" ? "Skip or reduce risk" : "Review before paper trading"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
