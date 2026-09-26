/** The user's stored preference: "system" means follow the OS setting. */
export type ThemePreference = "light" | "dark" | "system";

/** What actually gets applied to the DOM; "system" is always resolved to one of these first. */
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "algorithmic-mind-theme";
