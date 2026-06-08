function errorText(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    return [error.message, cause ? errorText(cause) : ""].join("\n");
  }

  if (typeof error === "object" && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

export function isMissingDatabaseSchemaError(error: unknown) {
  const message = errorText(error);

  return /relation .* does not exist|table .* does not exist|schema .* does not exist|column .* does not exist/i.test(
    message,
  );
}

export function databaseSetupMessage() {
  return "Database is connected, but tables are missing. Run npm run db:push, then refresh.";
}
