"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function TickerSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const symbol = value.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "");
    if (!symbol) return;
    router.push(`/symbol/${encodeURIComponent(symbol)}`);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2" role="search">
      <label htmlFor="ticker-search" className="sr-only">Search ticker</label>
      <Input
        id="ticker-search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ticker: AAPL, TSLA..."
        className="h-8 w-40 text-xs sm:w-48"
        maxLength={12}
        autoCapitalize="characters"
      />
      <Button type="submit" size="sm" className="h-8 gap-1 px-2 text-xs" title="Open ticker">
        <Search className="h-3.5 w-3.5" />
        Go
      </Button>
    </form>
  );
}
