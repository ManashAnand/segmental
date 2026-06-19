"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BrainCircuit, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/agent", label: "Agent" },
  { href: "/compare", label: "Compare" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-chart-2/30 ring-1 ring-primary/30">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <div className="absolute inset-0 rounded-xl bg-primary/10 blur-md" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold tracking-tight">
              Segmental<span className="text-primary">.ai</span>
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              10-K Intelligence Platform
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-1 rounded-xl border border-border/60 bg-card/40 p-1">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:px-4",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-lg bg-primary/15 ring-1 ring-primary/25"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
            <Sun className="h-4 w-4" />
          </Button>
          <div className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary/30 to-chart-2/20 text-xs font-semibold ring-1 ring-border/80">
            MA
          </div>
        </div>
      </div>
    </motion.header>
  );
}
