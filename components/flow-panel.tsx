"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FlowItem } from "@/types";
import { Zap } from "lucide-react";

function fmtPremium(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function FlowPanel({
  flow,
  loading,
  isMock,
}: {
  flow: FlowItem[];
  loading: boolean;
  isMock: boolean;
}) {
  return (
    <Card className="card-3d">
      <CardHeader className="pb-3">
        <CardTitle className="headline text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Big Money Flow
          {isMock && (
            <Badge variant="secondary" className="text-[10px] font-semibold">
              SAMPLE DATA
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        {!loading && flow.length === 0 && (
          <p className="text-xs text-muted-foreground">No flow prints found.</p>
        )}
        {!loading &&
          flow.slice(0, 8).map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs"
            >
              <div className="flex flex-col">
                <span className="font-semibold tabular">{f.contract}</span>
                <span className="text-muted-foreground">
                  {f.tradeType} · {f.size.toLocaleString()}x
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-bold tabular gold-text">{fmtPremium(f.premium)}</span>
                <span
                  className={
                    f.sentiment === "BULLISH"
                      ? "text-emerald-400"
                      : f.sentiment === "BEARISH"
                        ? "text-red-400"
                        : "text-muted-foreground"
                  }
                >
                  {f.sentiment}
                </span>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
