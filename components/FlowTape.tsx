"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_FLOW_FILTERS, FlowFilters } from "@/components/FlowFilters";
import { ApiEnvelope } from "@/types";
import { FlowFiltersState, LiveFlowEvent } from "@/types/features";
import { Radio } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const fmt = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(0)}K` : `$${n}`;

export function FlowTape({ symbol }: { symbol?: string }) {
  const [events, setEvents] = useState<LiveFlowEvent[]>([]);
  const [filters, setFilters] = useState<FlowFiltersState>(DEFAULT_FLOW_FILTERS);
  const [isSample, setIsSample] = useState(true);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const p = new URLSearchParams();
    if (symbol) p.set("symbol", symbol);
    if (filters.minPremium) p.set("minPremium", String(filters.minPremium));
    if (filters.sentiment && filters.sentiment !== "ALL") p.set("sentiment", filters.sentiment);
    if (filters.orderType && filters.orderType !== "ALL") p.set("orderType", filters.orderType);
    const res = await fetch(`/api/flow/live?${p}`);
    const json = (await res.json()) as ApiEnvelope<{ events: LiveFlowEvent[]; source: string }>;
    if (json.ok && json.data) {
      setEvents(json.data.events);
      setIsSample(json.data.source !== "LIVE");
    }
    setLoading(false);
  }, [symbol, filters]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000); // tape refresh
    return () => clearInterval(t);
  }, [load]);

  return (
    <Card className="card-3d">
      <CardHeader className="pb-3 space-y-3">
        <CardTitle className="headline text-sm flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary animate-pulse" />
          Options Flow Tape {symbol ? `· ${symbol}` : ""}
          {isSample && <Badge variant="secondary" className="text-[10px]">SAMPLE DATA</Badge>}
        </CardTitle>
        <FlowFilters value={filters} onChange={setFilters} />
      </CardHeader>
      <CardContent className="space-y-1.5 max-h-96 overflow-y-auto">
        {loading && <Skeleton className="h-24 w-full" />}
        {!loading && events.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">No prints match the filters.</p>
        )}
        {events.map((e) => (
          <div
            key={e.id}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs border-l-2 ${
              e.sentiment === "BULLISH"
                ? "border-emerald-400 bg-emerald-500/5"
                : e.sentiment === "BEARISH"
                  ? "border-red-400 bg-red-500/5"
                  : "border-primary/50 bg-muted/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/40 text-[9px]">{e.orderType}</Badge>
              <span className="font-semibold tabular">{e.contract}</span>
              <span className="text-muted-foreground tabular">{e.size.toLocaleString()}x</span>
            </div>
            <div className="flex items-center gap-3 tabular">
              <span className="font-bold gold-text">{fmt(e.premium)}</span>
              <span
                className={
                  e.sentiment === "BULLISH"
                    ? "text-emerald-400"
                    : e.sentiment === "BEARISH"
                      ? "text-red-400"
                      : "text-muted-foreground"
                }
              >
                {e.sentiment}
              </span>
              <span className="text-muted-foreground">
                {new Date(e.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
