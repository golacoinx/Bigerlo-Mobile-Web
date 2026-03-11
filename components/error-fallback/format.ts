import { Platform } from "react-native";

export function formatErrorDetails(error: Error): string {
  let details = `Error: ${error.message}\n\n`;
  if (error.stack) {
    details += `Stack Trace:\n${error.stack}`;
  }
  return details;
}

export function getMonoFont(): string {
  return Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  }) as string;
}
