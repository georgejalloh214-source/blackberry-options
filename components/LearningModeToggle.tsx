"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, LineChart } from "lucide-react";
import { useEffect, useState } from "react";

export type AppMode = "TRADER" | "LEARNING";

export function LearningModeToggle({ onChange }: { onChange?: (mode: AppMode) => void }) {
  const [mode, setMode] = useState<AppMode>("TRADER");

  useEffect(() => {
    const stored = window.localStorage.getItem("bbo:mode");
    if (stored === "LEARNING") setMode("LEARNING");
  }, []);

  const changeMode = (next: AppMode) => {
    setMode(next);
    window.localStorage.setItem("bbo:mode", next);
    onChange?.(next);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card/70 p-1">
      <Badge variant="outline" className="border-primary/30 px-2 text-[9px] tracking-wider">
        MODE
      </Badge>
      <Button
        size="sm"
        variant={mode === "TRADER" ? "default" : "ghost"}
        className="h-7 gap-1.5 px-2 text-[10px]"
        onClick={() => changeMode("TRADER")}
      >
        <LineChart className="h-3.5 w-3.5" /> Trader
      </Button>
      <Button
        size="sm"
        variant={mode === "LEARNING" ? "default" : "ghost"}
        className="h-7 gap-1.5 px-2 text-[10px]"
        onClick={() => changeMode("LEARNING")}
      >
        <GraduationCap className="h-3.5 w-3.5" /> Learn
      </Button>
    </div>
  );
}
