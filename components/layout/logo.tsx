import Link from "next/link";

// Uses the MARK-only svgs (logo-mark-dark / logo-mark-light), not the
// lockup svgs. The lockup bakes the wordmark into the raster at a fixed
// pixel resolution, which reads illegibly once shrunk to header height.
// The wordmark here is real text instead, set in the same editorial-serif
// display font already used for headlines (lib/fonts.ts), so it stays
// sharp at any size and matches the constitution's typography rules for
// display text (weight 700, tight tracking) rather than being frozen
// inside an image.
//
// No width/height attributes on the mark: those were previously hardcoded
// to the placeholder raster's exact pixel dimensions (983x561 etc.), which
// silently assumed every future file at this path shared that aspect
// ratio. That assumption broke the moment real artwork with different
// proportions landed at the same filename. Sizing is height-only via CSS
// (h-10 / h-12) with w-auto, so the displayed width always follows
// whatever the actual file's intrinsic aspect ratio is.
export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-mark-dark.svg"
        alt=""
        className="block h-10 w-auto dark:hidden sm:h-12"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-mark-light.svg"
        alt=""
        className="hidden h-10 w-auto dark:block sm:h-12"
      />
      <span className="font-display text-xl font-bold tracking-tight text-fg sm:text-2xl">
        Algorithmic Mind
      </span>
    </Link>
  );
}
