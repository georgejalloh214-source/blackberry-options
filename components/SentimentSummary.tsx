"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiEnvelope } from "@/types";
import { SentimentReport } from "@/types/features";
import { MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";

const toneClass: Record<string, string> = {
  BULLISH: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
  NEUTRAL: "bg-primary/15 text-primary border-primary/40",
  BEARISH: "bg-red-500/15 text-red-400 border-red-500/40",
};

export function SentimentSummary({ symbol }: { symbol: string }) {
  const [report, setReport] = useState<SentimentReport | null>(null);

  useEffect(() => {
    setReport(null);
    (async () => {
      const res = await fetch(`/api/sentiment/${symbol}`);
      const json = (await res.json()) as ApiEnvelope<SentimentReport>;
      if (json.ok && json.data) setReport(json.data);
    })();
  }, [symbol]);

  return (
    <Card className="card-3d">
      <CardHeader className="pb-3">
        <CardTitle className="headline text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          What People Are Saying
          {report?.isSample && (
            <Badge variant="secondary" className="text-[10px]">SAMPLE DATA</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!report ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className={`headline rounded-lg border px-3 py-1.5 text-sm ${toneClass[report.overall]}`}>
                {report.overall}
              </span>
              <span className="text-xs text-muted-foreground tabular">
                score {report.score > 0 ? "+" : ""}{report.score}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {report.sources.map((s) => (
                <div key={s.name} className="rounded bg-muted/40 p-2 text-center text-xs">
                  <div className="text-muted-foreground">{s.name}</div>
                  <div
                    className={`font-bold ${
                      s.label === "BULLISH"
                        ? "text-emerald-400"
                        : s.label === "BEARISH"
                          ? "text-red-400"
                          : "text-primary"
                    }`}
                  >
                    {s.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground tabular">{s.sampleSize} posts</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {report.topThemes.map((t) => (
                <Badge key={t} variant="outline" className="border-primary/40 text-[10px]">{t}</Badge>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{report.digest}</p>
            <p className="text-[10px] text-muted-foreground/70">
              Voices in the mix: {report.majorPlayers.join(" · ")}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
