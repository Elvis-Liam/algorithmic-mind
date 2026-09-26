import { THEME_STORAGE_KEY } from "@/types/theme";

// Runs synchronously in <head>, before the first paint, so there is no
// flash of the wrong theme. Reads the stored preference (default "system"),
// resolves it against the OS setting when needed, and sets data-theme on
// <html>. ThemeProvider (a client component) takes over after hydration and
// keeps this in sync with user toggles and OS changes.
const THEME_SCRIPT = `
(function () {
  try {
    var key = ${JSON.stringify(THEME_STORAGE_KEY)};
    var stored = localStorage.getItem(key) || "system";
    var resolved = stored === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : stored;
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.setAttribute("data-theme-preference", stored);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
