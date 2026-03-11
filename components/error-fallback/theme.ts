export type ErrorFallbackTheme = {
  background: string;
  backgroundSecondary: string;
  text: string;
  textSecondary: string;
  link: string;
  buttonText: string;
};

export function getErrorFallbackTheme(isDark: boolean): ErrorFallbackTheme {
  return {
    background: isDark ? "#000000" : "#FFFFFF",
    backgroundSecondary: isDark ? "#1C1C1E" : "#F2F2F7",
    text: isDark ? "#FFFFFF" : "#000000",
    textSecondary: isDark ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
    link: "#007AFF",
    buttonText: "#FFFFFF",
  };
}
