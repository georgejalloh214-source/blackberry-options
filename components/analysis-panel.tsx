"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ApiEnvelope,
  EntryTimingResult,
  ScannerResult,
  StrategyResult,
} from "@/types";
import { Activity, CheckCircle, Loader2, Target, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const signalStyles: Record<string, string> = {
  ENTER_NOW: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
  WAIT: "bg-primary/15 text-primary border-primary/40",
  AVOID: "bg-red-500/15 text-red-400 border-red-500/40",
};

export function AnalysisPanel({
  contract,
  onOpenPaperTrade,
}: {
  contract: ScannerResult | null;
  onOpenPaperTrade: (c: ScannerResult) => void;
}) {
  const [entry, setEntry] = useState<EntryTimingResult | null>(null);
  const [strategy, setStrategy] = useState<StrategyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [risk, setRisk] = useState<"LOW" | "MEDIUM" | "HIGH">("LOW");
  const [openingTrade, setOpeningTrade] = useState(false);

  const analyze = useCallback(async () => {
    if (!contract) return;
    setLoading(true);
    setEntry(null);
    setStrategy(null);
    try {
      const ref = {
        expiry: contract.expiry,
        strike: contract.strike,
        type: contract.type,
      };
      const [entryRes, stratRes] = await Promise.all([
        fetch("/api/entry-timing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: contract.symbol, optionContract: ref }),
        }).then((r) => r.json() as Promise<ApiEnvelope<EntryTimingResult>>),
        fetch("/api/strategy-selector", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: contract.symbol,
            optionContract: ref,
            userProfile: { riskTolerance: risk, accountSize: 25000, ownsShares: false },
          }),
        }).then((r) => r.json() as Promise<ApiEnvelope<StrategyResult>>),
      ]);
      if (entryRes.ok && entryRes.data) setEntry(entryRes.data);
      if (stratRes.ok && stratRes.data) setStrategy(stratRes.data);
    } finally {
      setLoading(false);
    }
  }, [contract, risk]);

  useEffect(() => {
    analyze();
  }, [analyze]);

  const handleOpenTrade = async () => {
    if (!contract) return;
    setOpeningTrade(true);
    try {
      onOpenPaperTrade(contract);
    } finally {
      setOpeningTrade(false);
    }
  };

  if (!contract) {
    return (
      <Card className="card-3d">
        <CardHeader className="pb-3">
          <CardTitle className="headline text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Entry Timing + Strategy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground py-6 text-center">
            Pick a contract from the scanner (Analyze) to get an entry signal and a
            strategy recommendation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-3d card-3d-gold">
      <CardHeader className="pb-3">
        <CardTitle className="headline text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          {contract.symbol} ${contract.strike} {contract.type} · {contract.expiry}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Risk tolerance</span>
          <Select value={risk} onValueChange={(v) => setRisk(v as typeof risk)}>
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {!loading && entry && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span
                className={`headline rounded-lg border px-4 py-2 text-lg ${signalStyles[entry.signal]}`}
              >
                {entry.signal.replace("_", " ")}
              </span>
              <div className="text-xs text-muted-foreground">
                Risk score{" "}
                <span className="font-bold text-foreground tabular">{entry.riskScore}/100</span>
                <Badge variant="secondary" className="ml-2 text-[9px]">
                  {entry.botStatus === "LIVE" ? "LIVE BOTS" : "MOCK BOTS"}
                </Badge>
              </div>
            </div>
            <ul className="space-y-1">
              {entry.reasons.map((r, i) => (
                <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                  {r.toLowerCase().includes("risk") || r.toLowerCase().includes("against") ? (
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400 mt-0.5" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
                  )}
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!loading && strategy && (
          <div className="rounded-lg bg-muted/40 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">
                Recommended:{" "}
                <span className="gold-text">
                  {strategy.recommendedStrategy.replace(/_/g, " ")}
                </span>
              </span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
              {strategy.rationale.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            <div className="grid grid-cols-3 gap-2 text-center text-xs tabular">
              <div className="rounded bg-background/50 p-2">
                <div className="text-muted-foreground">Max loss</div>
                <div className="font-bold text-red-400">
                  ${strategy.keyParameters.maxLossEstimate.toLocaleString()}
                </div>
              </div>
              <div className="rounded bg-background/50 p-2">
                <div className="text-muted-foreground">Est. POP</div>
                <div className="font-bold text-emerald-400">
                  {strategy.keyParameters.probabilityOfProfitEstimate}%
                </div>
              </div>
              <div className="rounded bg-background/50 p-2">
                <div className="text-muted-foreground">Margin</div>
                <div className="font-bold">
                  ${strategy.keyParameters.marginRequiredEstimate.toLocaleString()}
                </div>
              </div>
            </div>
            {strategy.alternatives.map((a, i) => (
              <p key={i} className="text-[11px] text-muted-foreground/80">
                Not {a.strategy.replace(/_/g, " ").toLowerCase()}: {a.whyNot}
              </p>
            ))}
          </div>
        )}

        {!loading && entry && (
          <Button
            className="w-full font-bold tracking-wide"
            disabled={openingTrade}
            onClick={handleOpenTrade}
          >
            {openingTrade && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Open Paper Trade (Sell to Open)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
