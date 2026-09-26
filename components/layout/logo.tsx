import Link from "next/link";

// The dark-colour lockup renders on the light (ivory) theme, the light-
// colour lockup renders on the dark (green) theme, per the constitution's
// "logo-mark-dark.svg for ivory backgrounds, logo-mark-light.svg for green
// backgrounds" rule. Both are in the DOM; only one is visible at a time via
// the dark: variant, which reads the data-theme attribute the inline head
// script sets before first paint, so there is no flash and no client JS
// needed just to show the right logo.
export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center"
      aria-label="Algorithmic Mind, home"
    >
      {/*
        Plain <img>, not next/image, is deliberate here: these are the
        placeholder raster-in-svg assets described in README.md and
        CONTEXT.md. next/image's optimization pipeline resizes/re-encodes
        raster sources, but can't usefully re-process a raster payload
        already embedded inside an .svg wrapper, so switching would add
        complexity without the real benefit next/image exists for. Revisit
        once the true vector logo lands.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-lockup-dark.svg"
        alt=""
        className="block h-9 w-auto dark:hidden"
        width={983}
        height={561}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-lockup-light.svg"
        alt=""
        className="hidden h-9 w-auto dark:block"
        width={1030}
        height={599}
      />
    </Link>
  );
}
