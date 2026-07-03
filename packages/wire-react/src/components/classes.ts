export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export type WireColorMode = "light" | "dark" | "system";

export function themeClass(colorMode: WireColorMode | undefined): string | undefined {
  return colorMode ? `wire-theme-${colorMode}` : undefined;
}
