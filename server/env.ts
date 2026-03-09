type RequiredServerEnv = "GEMINI_API_KEY";

type ValidationResult = {
  ok: boolean;
  missing: RequiredServerEnv[];
};

function validateRequiredEnvVars(): ValidationResult {
  const missing: RequiredServerEnv[] = [];

  if (!process.env.GEMINI_API_KEY?.trim()) {
    missing.push("GEMINI_API_KEY");
  }

  return { ok: missing.length === 0, missing };
}

export function assertServerEnv(): void {
  const result = validateRequiredEnvVars();

  if (!result.ok) {
    throw new Error(
      `Missing required server environment variable(s): ${result.missing.join(", ")}. Please configure them before starting the server.`,
    );
  }
}

export function getGeminiApiKey(): string {
  const value = process.env.GEMINI_API_KEY;

  if (!value || !value.trim()) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add it to your environment to use /api/analyze.",
    );
  }

  return value;
}
