import React from "react";

interface AppShellProps {
  children: React.ReactNode;
  /** Active route hash, e.g. "#/", "#/methodology". Drives nav highlighting. */
  activeRoute?: string;
  /** Optional override for the right-side header CTA action. */
  onCtaClick?: () => void;
}

const NAV_LINKS = [
  { route: "#/", label: "Transparency Feed" },
  { route: "#/methodology", label: "How It Works" },
  { route: "#/pricing", label: "Pricing" },
];

/**
 * Sticky top header + max-width container wrapping the page content.
 * Replaces the old Sidebar rail — the new designs use a top nav instead.
 * The deep-charcoal CTA mirrors the buttons in the new HTML prototypes.
 */
export default function AppShell({ children, activeRoute = "#/", onCtaClick }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-arcade-yellow text-arcade-ink relative">
      {/* Persistent grain overlay */}
      <div className="grain-overlay" />

      <header className="sticky top-0 z-50 bg-arcade-yellow border-b-2 border-arcade-ink">
        <div className="max-w-[1280px] mx-auto px-16 h-20 flex items-center justify-between">
          <a href="#/" className="flex items-center gap-3">
            <span className="font-display text-[28px] tracking-brutal text-arcade-ink">
              PRISM
            </span>
            <span className="hidden md:inline font-body text-[9px] tracking-widest text-arcade-ink/60 uppercase font-bold">
              Transparency AI
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => {
              const isActive = activeRoute === link.route;
              return (
                <a
                  key={link.route}
                  href={link.route}
                  className={`font-body text-[14px] font-bold uppercase tracking-widest transition-colors ${
                    isActive
                      ? "text-arcade-ink border-b-2 border-arcade-ink pb-1"
                      : "text-arcade-ink/60 hover:text-arcade-ink"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onCtaClick}
            className="bg-arcade-ink text-arcade-yellow px-6 py-2.5 font-body text-[14px] font-bold uppercase tracking-widest border-2 border-arcade-ink shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            Open Dashboard
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-1">{children}</main>
    </div>
  );
}