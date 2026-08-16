"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScannerResult } from "@/types";
import { Search, Send } from "lucide-react";

export function ScannerPanel({
  results,
  loading,
  onSendToEntry,
}: {
  results: ScannerResult[];
  loading: boolean;
  onSendToEntry: (r: ScannerResult) => void;
}) {
  return (
    <Card className="card-3d">
      <CardHeader className="pb-3">
        <CardTitle className="headline text-sm flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          Opportunity Scanner
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        )}
        {!loading && results.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No contracts passed the filters. Try widening delta or volume limits.
          </p>
        )}
        {!loading && results.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Score</TableHead>
                  <TableHead>Contract</TableHead>
                  <TableHead className="text-right">Δ</TableHead>
                  <TableHead className="text-right">Θ/day</TableHead>
                  <TableHead className="text-right">IV</TableHead>
                  <TableHead className="text-right">Bid</TableHead>
                  <TableHead className="text-right">Vol / OI</TableHead>
                  <TableHead>Tag</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={`${r.expiry}-${r.strike}-${r.type}`} className="text-xs tabular">
                    <TableCell>
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                          r.score >= 70
                            ? "bg-primary/20 text-primary"
                            : r.score >= 50
                              ? "bg-muted text-foreground"
                              : "bg-muted/50 text-muted-foreground"
                        }`}
                        title={`Delta fit ${r.scoreBreakdown.deltaFit} · Theta ${r.scoreBreakdown.thetaYield} · IV ${r.scoreBreakdown.ivFit} · Liquidity ${r.scoreBreakdown.liquidity} · Support ${r.scoreBreakdown.supportProximity}`}
                      >
                        {r.score}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap">
                      ${r.strike} {r.type[0]} · {r.expiry.slice(5)} · {r.dte}d
                    </TableCell>
                    <TableCell className="text-right">{r.greeks.delta.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{r.greeks.theta.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{(r.iv * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-right">${r.bid.toFixed(2)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {r.volume.toLocaleString()} / {r.openInterest.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] border-primary/40">
                        {r.strategyTag.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-primary hover:text-primary"
                        onClick={() => onSendToEntry(r)}
                      >
                        <Send className="h-3 w-3" />
                        Analyze
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
