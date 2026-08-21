"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiEnvelope } from "@/types";
import { Activity } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface RealtimeQuote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  source: "FINNHUB" | "SAMPLE";
}

export function RealtimeQuoteCard({ symbol }: { symbol: string }) {
  const [quote, setQuote] = useState<RealtimeQuote | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const prevPrice = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/quote/realtime?symbol=${symbol}`);
      const json = (await res.json()) as ApiEnvelope<RealtimeQuote>;
      if (!json.ok || !json.data) return;
      const q = json.data;
      if (prevPrice.current !== null && q.price !== prevPrice.current) {
        setFlash(q.price > prevPrice.current ? "up" : "down");
        setTimeout(() => setFlash(null), 800);
      }
      prevPrice.current = q.price;
      setQuote(q);
      setUpdatedAt(new Date().toLocaleTimeString());
    } catch {
      /* transient network error — next tick will retry */
    }
  }, [symbol]);

  useEffect(() => {
    prevPrice.current = null;
    setQuote(null);
    load();
    const t = setInterval(load, 10_000); // 10s refresh
    return () => clearInterval(t);
  }, [load]);

  return (
    <Card className="card-3d card-3d-gold">
      <CardHeader className="pb-2">
        <CardTitle className="headline text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Live Quote · {symbol}
          <Badge
            variant="secondary"
            className={`text-[9px] ${
              quote?.source === "FINNHUB" ? "bg-emerald-500/20 text-emerald-400" : ""
            }`}
          >
            {quote?.source === "FINNHUB" ? "FINNHUB LIVE" : "SAMPLE"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!quote ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <>
            <div className="flex items-end gap-3">
              <span
                className={`text-4xl font-bold tabular transition-colors duration-300 ${
                  flash === "up"
                    ? "text-emerald-400"
                    : flash === "down"
                      ? "text-red-400"
                      : ""
                }`}
              >
                ${quote.price.toFixed(2)}
              </span>
              <span
                className={`text-sm font-semibold tabular ${
                  quote.changePct >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {quote.changePct >= 0 ? "+" : ""}
                {quote.change.toFixed(2)} ({quote.changePct >= 0 ? "+" : ""}
                {quote.changePct.toFixed(2)}%)
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground tabular">
              <span>Open ${quote.open.toFixed(2)}</span>
              <span>Prev ${quote.prevClose.toFixed(2)}</span>
              <span>High ${quote.high.toFixed(2)}</span>
              <span>Low ${quote.low.toFixed(2)}</span>
            </div>
            {updatedAt && (
              <p className="mt-2 text-[10px] text-muted-foreground/70">
                Updates every 10s · last {updatedAt}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
