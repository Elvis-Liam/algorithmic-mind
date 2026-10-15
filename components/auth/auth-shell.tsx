import type { ReactNode } from 'react';

interface AuthShellProps {
  kicker: string;
  title: string;
  lead?: string;
  wide?: boolean;
  children: ReactNode;
}

export function AuthShell({ kicker, title, lead, wide = false, children }: AuthShellProps) {
  return (
    <section
      aria-labelledby="page-title"
      className={`mx-auto w-full px-4 py-16 sm:py-24 ${wide ? 'max-w-3xl' : 'max-w-md'}`}
    >
      <p className="font-mono text-xs font-medium uppercase tracking-[0.1em] text-fg-muted">
        {kicker}
      </p>
      <h1
        id="page-title"
        className="mt-3 border-b border-accent pb-4 font-display text-4xl font-bold leading-[1.1] tracking-[-0.015em] text-fg"
      >
        {title}
      </h1>
      {lead ? <p className="mt-4 text-base leading-relaxed text-fg">{lead}</p> : null}
      <div className="mt-8">{children}</div>
    </section>
  );
}
