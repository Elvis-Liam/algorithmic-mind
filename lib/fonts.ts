import { IBM_Plex_Sans, IBM_Plex_Mono, Playfair_Display } from "next/font/google";

// next/font downloads these at build time and self-hosts them from our own
// origin, so this satisfies "self host the fonts, do not load from a third
// party" without a runtime request to fonts.googleapis.com.

export const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-ibm-plex-sans",
});

export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

// Editorial serif for display and headlines: Playfair Display, weight
// 600-700, used with a tight negative tracking utility in globals.css.
export const editorialSerif = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-editorial-serif",
});

export const fontVariables = [
  ibmPlexSans.variable,
  ibmPlexMono.variable,
  editorialSerif.variable,
].join(" ");
