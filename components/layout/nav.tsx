import Link from "next/link";

// Straight from the constitution's scope line ("software development,
// software engineering, and artificial intelligence"), not the placeholder
// mockup's Startups/Events/Reviews, which reads as generic SaaS-blog
// taxonomy the constitution explicitly rules out ("not a general technology
// news site"). Routes don't exist until the phase that builds them; linking
// to them now is a real link to a real (currently empty) route, not a dead
// control.
const NAV_ITEMS = [
  { href: "/software", label: "Software" },
  { href: "/engineering", label: "Engineering" },
  { href: "/ai", label: "AI" },
];

export function Nav() {
  return (
    <nav aria-label="Primary">
      <ul className="-ml-3 flex flex-wrap gap-x-2 gap-y-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="font-mono-label inline-block px-3 py-2.5 text-fg transition-colors hover:text-accent"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
