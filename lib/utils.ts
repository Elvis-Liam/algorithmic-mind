/**
 * Joins class names, skipping falsy values. Deliberately not a dependency
 * (clsx/tailwind-merge) per "do not add a library that duplicates
 * something already in the project" — this is a five-line utility, not a
 * capability the project is missing.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
