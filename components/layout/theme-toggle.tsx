"use client";

import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";
import type { ThemePreference } from "@/types/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex divide-x divide-rule border border-rule text-xs"
    >
      {OPTIONS.map((option) => {
        const active = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(option.value)}
            className={cn(
              "font-mono-label px-2.5 py-2 text-[10px] transition-colors",
              active ? "bg-brand text-bg" : "bg-transparent text-fg hover:bg-surface",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
