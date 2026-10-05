"use client";

import { BarChart3, BookOpen, LayoutDashboard, LineChart, Menu, Settings2, Telescope, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/paper-trading", label: "Paper Trading", icon: LineChart },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/overview", label: "Market Overview", icon: Telescope },
  { href: "/symbol/AAPL", label: "Symbol View", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <button
        type="button"
        className="fixed left-4 top-4 z-30 rounded-md border border-border bg-card p-2 text-primary lg:hidden"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close navigation" : "Open navigation"}
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>
      <aside className={`fixed inset-y-0 left-0 z-20 w-64 border-r border-border bg-card/95 p-5 backdrop-blur transition-transform lg:sticky lg:top-0 lg:flex lg:h-screen lg:translate-x-0 lg:flex-col ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="border-b border-border pb-5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-primary">Trading terminal</p>
          <h2 className="headline mt-2 text-lg">Black Berry <span className="gold-text">Options</span></h2>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Decision tools for paper trading and options research.</p>
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Main navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary">
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border pt-4 text-[10px] leading-4 text-muted-foreground">
          <p className="text-primary">MARKET DATA STATUS</p>
          <p className="mt-1">Live / delayed quotes · Yahoo options · simulated flow</p>
        </div>
      </aside>
      {open && <button type="button" className="fixed inset-0 z-10 bg-background/70 lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation overlay" />}
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
