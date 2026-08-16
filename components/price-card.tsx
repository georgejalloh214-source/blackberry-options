"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StockQuote } from "@/types";
import { TrendingDown, TrendingUp } from "lucide-react";

export function PriceCard({ quote, loading }: { quote: StockQuote | null; loading: boolean }) {
  if (loading || !quote) {
    return (
      <Card className="card-3d">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-4 w-40" />
        </CardContent>
      </Card>
    );
  }
  const up = quote.changePct >= 0;
  return (
    <Card className="card-3d card-3d-gold">
      <CardHeader className="pb-2">
        <CardTitle className="headline text-sm text-muted-foreground">{quote.symbol}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold tabular">${quote.price.toFixed(2)}</span>
          <span className={`flex items-center gap-1 text-sm font-semibold tabular ${up ? "text-emerald-400" : "text-red-400"}`}>
            {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {up ? "+" : ""}
            {quote.changePct.toFixed(2)}%
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground tabular">
          <span>Bid ${quote.bid.toFixed(2)}</span>
          <span>Ask ${quote.ask.toFixed(2)}</span>
          <span>High ${quote.dayHigh.toFixed(2)}</span>
          <span>Low ${quote.dayLow.toFixed(2)}</span>
          <span className="text-emerald-400/90">Support ${quote.supportLevel}</span>
          <span className="text-red-400/90">Resist ${quote.resistanceLevel}</span>
        </div>
      </CardContent>
    </Card>
  );
}
