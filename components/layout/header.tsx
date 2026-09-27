import { Logo } from "@/components/layout/logo";
import { Nav } from "@/components/layout/nav";
import { SiteClock } from "@/components/layout/site-clock";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Header() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-3">
            <SiteClock />
            <ThemeToggle />
          </div>
        </div>

        <p className="mt-3 max-w-prose text-sm text-fg-muted">
          The latest developments, releases, breakthroughs, and industry
          movements shaping software and AI.
        </p>

        <div className="mt-6 border-t border-rule pt-4">
          <Nav />
        </div>
      </div>
    </header>
  );
}
