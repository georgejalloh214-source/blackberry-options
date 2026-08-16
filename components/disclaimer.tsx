import { Info } from "lucide-react";

export function Disclaimer() {
  return (
    <footer className="mt-8 border-t border-border pt-4 pb-8">
      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground tracking-wide">
        <Info className="h-3.5 w-3.5 text-primary" />
        Decision support only — not financial advice.
      </p>
    </footer>
  );
}
