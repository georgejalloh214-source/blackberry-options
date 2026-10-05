"use client";

import { Badge } from "@/components/ui/badge";
import { ApiStatus, useApiData } from "@/lib/useApiData";
import { YahooOptionsPayload } from "@/types";
import { Activity, AlertTriangle, CircleOff, Sparkles, Waves } from "lucide-react";

type QuoteSource = "FINNHUB" | "YAHOO" | "SAMPLE" | "UNAVAILABLE";

const sourceStyles = {
  live: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  delayed: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  sample: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  unavailable: "border-border bg-muted/30 text-muted-foreground",
};

function quoteLabel(status: ApiStatus, source: QuoteSource | undefined) {
  if (status === "loading") return { text: "CHECKING…", style: sourceStyles.unavailable };
  if (status !== "ready") return { text: "UNAVAILABLE", style: sourceStyles.unavailable };
  if (source === "FINNHUB") return { text: "FINNHUB LIVE", style: sourceStyles.live };
  if (source === "YAHOO") return { text: "YAHOO · DELAYED", style: sourceStyles.delayed };
  if (source === "SAMPLE") return { text: "SAMPLE", style: sourceStyles.sample };
  return { text: "UNAVAILABLE", style: sourceStyles.unavailable };
}

function optionsLabel(status: ApiStatus, source: string | undefined) {
  if (status === "loading") return { text: "CHECKING…", style: sourceStyles.unavailable };
  if (status === "ready" && source === "YAHOO_OPTIONS") return { text: "YAHOO · DELAYED", style: sourceStyles.delayed };
  return { text: "UNAVAILABLE", style: sourceStyles.unavailable };
}

export function DataSourcePanel({ symbol = "SPY" }: { symbol?: string }) {
  const encoded = symbol.trim() ? encodeURIComponent(symbol.trim()) : null;
  const quoteState = useApiData<{ source?: QuoteSource }>(encoded && `/api/quote/realtime?symbol=${encoded}`);
  const optionsState = useApiData<YahooOptionsPayload>(encoded && `/api/market/options?symbol=${encoded}`);

  const quote = quoteLabel(quoteState.status, quoteState.status === "ready" ? quoteState.data.source : undefined);
  const options = optionsLabel(optionsState.status, optionsState.status === "ready" ? optionsState.data.source : undefined);
  const sources = [
    { name: "Quotes", value: quote.text, style: quote.style, icon: Activity },
    { name: "Options", value: options.text, style: options.style, icon: Waves },
    { name: "Flow", value: "SIMULATED", style: sourceStyles.sample, icon: AlertTriangle },
    { name: "Dark Pool", value: "SIMULATED", style: sourceStyles.sample, icon: AlertTriangle },
    { name: "GEX", value: "NOT AVAILABLE", style: sourceStyles.unavailable, icon: CircleOff },
    { name: "AI Analysis", value: "MAGICA", style: sourceStyles.live, icon: Sparkles },
  ];

  return (
    <section aria-label="Market data status" className="min-w-0 border-y border-border/70 py-3">
      <div className="mb-2 flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Market Data Status</h2>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {sources.map(({ name, value, style, icon: Icon }) => (
          <div key={name} className="flex min-w-0 items-center gap-2 rounded-md border border-border/60 bg-card/40 px-2 py-1.5">
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-[9px] text-muted-foreground">{name}</p>
              <Badge variant="outline" className={`max-w-full truncate px-1.5 py-0 text-[8px] ${style}`}>{value}</Badge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
