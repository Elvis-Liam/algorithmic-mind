import { Logo } from "@/components/layout/logo";
import { Nav } from "@/components/layout/nav";
import { SiteClock } from "@/components/layout/site-clock";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Header() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <Logo />
            <p className="max-w-prose text-sm text-fg-muted">
              The latest developments, releases, breakthroughs, and industry
              movements shaping software and AI.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <SiteClock />
            <ThemeToggle />
          </div>
        </div>

        <div className="mt-6 border-t border-rule pt-4">
          <Nav />
        </div>
      </div>
    </header>
  );
}
