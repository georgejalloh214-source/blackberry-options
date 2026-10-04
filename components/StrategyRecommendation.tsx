"use client";

import { RecommendedLeg } from "@/lib/bot/strategyEngine";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownToLine, ArrowUpFromLine, Sparkles } from "lucide-react";

export function StrategyRecommendation({ legs }: { legs: RecommendedLeg[] }) {
  return (
    <Card className="card-3d card-3d-gold">
      <CardHeader className="pb-3">
        <CardTitle className="headline flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-primary" /> Strategy Recommendation</CardTitle>
      </CardHeader>
      <CardContent>
        {!legs.length ? (
          <p className="text-xs leading-5 text-muted-foreground">No vertical spread meets the current score threshold. Wait for clearer trend and flow alignment.</p>
        ) : (
          <div className="space-y-2">
            {legs.map((leg) => <div key={`${leg.action}-${leg.type}-${leg.strike}`} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3 text-xs"><span className="flex items-center gap-2 font-semibold"><Badge variant="outline" className={leg.action === "SELL" ? "border-primary/40 text-primary" : "border-sky-400/40 text-sky-300"}>{leg.action === "SELL" ? <ArrowDownToLine className="mr-1 h-3 w-3" /> : <ArrowUpFromLine className="mr-1 h-3 w-3" />}{leg.action}</Badge>{leg.type} ${leg.strike}</span><span className="text-right tabular text-muted-foreground">{leg.expiration}<br /><strong className="text-foreground">${leg.premium.toFixed(2)}</strong> premium</span></div>)}
            <p className="pt-2 text-[10px] text-muted-foreground">Suggested vertical spread. Review liquidity, width, and maximum loss before placing a paper trade.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
