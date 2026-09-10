"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiEnvelope } from "@/types";
import { EntryTimingResult } from "@/types";
import { MultiLegOption } from "@/components/MultiLegBuilder";
import { BrainCircuit, CirclePlay, CircleStop } from "lucide-react";
import { useMemo, useState } from "react";

export function AutoEntryToggle({ symbol, options }: { symbol: string; options: MultiLegOption[] }) {
  const [enabled, setEnabled] = useState(false);
  const [result, setResult] = useState<EntryTimingResult | null>(null);
  const [loading, setLoading] = useState(false);

  const contract = useMemo(() => {
    const option = options[Math.floor(options.length / 2)];
    return option ? { expiry: String(option.expiration), strike: option.strike, type: option.type as "PUT" | "CALL" } : null;
  }, [options]);

  const scan = async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const response = await fetch("/api/entry-timing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, optionContract: contract }),
      });
      const payload = (await response.json()) as ApiEnvelope<EntryTimingResult>;
      if (payload.ok && payload.data) setResult(payload.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`card-3d ${enabled ? "card-3d-gold" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="headline flex items-center gap-2 text-sm">
            <BrainCircuit className="h-4 w-4 text-primary" /> Auto-Entry Bot
            <Badge variant="secondary" className={`text-[9px] ${enabled ? "bg-emerald-500/20 text-emerald-400" : ""}`}>
              {enabled ? "ARMED" : "OFF"}
            </Badge>
          </CardTitle>
          <Button size="sm" variant={enabled ? "destructive" : "default"} className="h-8 gap-1 text-xs" onClick={() => setEnabled((value) => !value)}>
            {enabled ? <CircleStop className="h-3.5 w-3.5" /> : <CirclePlay className="h-3.5 w-3.5" />}
            {enabled ? "Disarm" : "Arm Bot"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3 text-xs">
          <span className="text-muted-foreground">Scanning {symbol}</span>
          <span className="font-semibold">{contract ? `${contract.type} $${contract.strike}` : "Waiting for chain"}</span>
        </div>
        <Button size="sm" variant="outline" className="h-8 w-full text-xs" disabled={!contract || loading} onClick={scan}>
          {loading ? "Scanning signals..." : "Scan entry timing"}
        </Button>
        {result && (
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3 text-xs">
            <div className="flex items-center justify-between"><span className="font-semibold">{result.signal.replace(/_/g, " ")}</span><Badge variant="outline" className="text-[9px]">{result.botStatus}</Badge></div>
            <p className="text-muted-foreground">Risk score: <strong className="text-foreground">{result.riskScore}</strong></p>
            <ul className="space-y-1 text-muted-foreground">{result.reasons.slice(0, 3).map((reason) => <li key={reason}>• {reason}</li>)}</ul>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground/70">Entry timing reviews trend, support, flow, and contract risk. It does not place trades automatically.</p>
      </CardContent>
    </Card>
  );
}
