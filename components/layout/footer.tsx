import Link from "next/link";

const SECTION_LINKS = [
  { href: "/software", label: "Software" },
  { href: "/engineering", label: "Engineering" },
  { href: "/ai", label: "AI" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
];

// No social row yet: the constitution rules out fabricated content, and no
// real Algorithmic Mind social handles exist to link to (the reference
// mockup's "[PLATFORM 1] @handle1" is an explicit bracketed placeholder,
// not real data). Add this section in the phase that has real accounts,
// per "leave it out of the interface entirely rather than shipping" a
// fabricated or dead link.

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-rule">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <h2 className="font-mono-label mb-3 text-fg-muted">Sections</h2>
            <ul className="flex flex-col">
              {SECTION_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-block px-2 py-2 -mx-2 text-sm hover:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-mono-label mb-3 text-fg-muted">Legal</h2>
            <ul className="flex flex-col">
              {LEGAL_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-block px-2 py-2 -mx-2 text-sm hover:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-mono-label mb-3 text-fg-muted">Algorithmic Mind</h2>
            <p className="max-w-prose text-sm text-fg-muted">
              Covering software development, software engineering, and
              artificial intelligence.
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-rule pt-6">
          <p className="font-mono-label text-fg-muted">
            &copy; {year} Algorithmic Mind
          </p>
        </div>
      </div>
    </footer>
  );
}
