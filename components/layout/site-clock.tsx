"use client";

import { useEffect, useState } from "react";

function format(date: Date): string {
  const datePart = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(date);
  return `${datePart} \u00b7 ${timePart}`;
}

export function SiteClock() {
  // Null on the server and on first client render, so SSR output and the
  // first hydrated paint match exactly. Filled in immediately after via
  // useEffect, before the user can notice.
  const [display, setDisplay] = useState<string | null>(null);

  useEffect(() => {
    setDisplay(format(new Date()));
    const id = window.setInterval(() => setDisplay(format(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p className="font-mono-label text-fg-muted" suppressHydrationWarning>
      {display ?? "\u00a0"}
    </p>
  );
}
