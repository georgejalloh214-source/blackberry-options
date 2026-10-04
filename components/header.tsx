"use client";

import { Badge } from "@/components/ui/badge";
import { TickerSearch } from "@/components/TickerSearch";
import { Clock } from "lucide-react";
import Link from "next/link";

export function Header({ asOf }: { asOf: string | null }) {
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
      <div>
        <h1 className="headline text-2xl sm:text-3xl">
          <span className="text-foreground">Black Berry</span>{" "}
          <span className="gold-text">Options</span>
        </h1>

        <p className="text-xs text-muted-foreground mt-1 tracking-wide">
          Live Options Tools + Paper Trading
        </p>

        {/* ⭐ Added Navigation Links */}
        <nav className="mt-2 flex gap-4 text-xs">
          <Link href="/" className="text-muted-foreground hover:text-primary">
            Dashboard
          </Link>
          <Link href="/paper-trading" className="text-muted-foreground hover:text-primary">
            Paper Trading
          </Link>
          <Link href="/symbol/AAPL" className="text-muted-foreground hover:text-primary">
            Symbol View
          </Link>
          <Link href="/analytics" className="text-muted-foreground hover:text-primary">
            Analytics
          </Link>
          <Link href="/overview" className="text-muted-foreground hover:text-primary">
            Market Overview
          </Link>
          <Link href="/settings" className="text-muted-foreground hover:text-primary">
            Settings
          </Link>
        </nav>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <TickerSearch />
        <Badge variant="outline" className="border-primary/40 text-primary gap-1">
          <Clock className="h-3 w-3" />
          Delayed 15 min
        </Badge>

        {asOf && (
          <span className="text-xs text-muted-foreground tabular">
            as of {new Date(asOf).toLocaleTimeString()}
          </span>
        )}
      </div>
    </header>
  );
}
