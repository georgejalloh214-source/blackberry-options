"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiEnvelope } from "@/types";
import { DarkPoolPrint, PriceCluster } from "@/types/features";
import { EyeOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const fmt = (n: number) =>
  n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${(n / 1e3).toFixed(0)}K`;

export function DarkPoolTape({ symbol }: { symbol: string }) {
  const [prints, setPrints] = useState<DarkPoolPrint[]>([]);
  const [clusters, setClusters] = useState<PriceCluster[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/flow/dark?symbol=${symbol}`);
    const json = (await res.json()) as ApiEnvelope<{ prints: DarkPoolPrint[]; clusters: PriceCluster[] }>;
    if (json.ok && json.data) {
      setPrints(json.data.prints);
      setClusters(json.data.clusters);
    }
    setLoading(false);
  }, [symbol]);

  useEffect(() => {
    setLoading(true);
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const maxNotional = Math.max(1, ...clusters.map((c) => c.totalNotional));

  return (
    <Card className="card-3d">
      <CardHeader className="pb-3">
        <CardTitle className="headline text-sm flex items-center gap-2">
          <EyeOff className="h-4 w-4 text-primary" />
          Dark Pool Insights · {symbol}
          <Badge variant="secondary" className="text-[10px]">SAMPLE DATA</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <Skeleton className="h-24 w-full" />}

        {!loading && clusters.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="headline text-[10px] text-muted-foreground">
              Institutional Price Clusters (support / resistance)
            </h4>
            {clusters.map((c) => (
              <div key={c.price} className="flex items-center gap-2 text-xs tabular">
                <span className="w-16 font-semibold">${c.price}</span>
                <div className="h-3 flex-1 rounded bg-muted/30 overflow-hidden">
                  <div
                    className={c.kind === "SUPPORT" ? "h-full bg-emerald-500/60" : "h-full bg-red-500/60"}
                    style={{ width: `${(c.totalNotional / maxNotional) * 100}%` }}
                  />
                </div>
                <span className="w-16 text-right font-bold gold-text">{fmt(c.totalNotional)}</span>
                <Badge variant="outline" className="w-24 justify-center border-primary/40 text-[9px]">
                  {c.kind} · {c.printCount}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {!loading && (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            <h4 className="headline text-[10px] text-muted-foreground">Off-Exchange Prints</h4>
            {prints.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded bg-muted/30 px-3 py-1.5 text-xs tabular">
                <span>
                  <span className="font-semibold">${p.price.toFixed(2)}</span>
                  <span className="text-muted-foreground"> · {p.size.toLocaleString()} sh · {p.venue}</span>
                  {p.aboveAsk && <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 text-[9px]" variant="secondary">ABOVE ASK</Badge>}
                  {p.belowBid && <Badge className="ml-2 bg-red-500/20 text-red-400 text-[9px]" variant="secondary">BELOW BID</Badge>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-bold gold-text">{fmt(p.notional)}</span>
                  <span className="text-muted-foreground">
                    {new Date(p.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
