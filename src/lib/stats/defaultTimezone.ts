// Used for a new profile; saved timezone choices remain authoritative.
export function defaultTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    new Intl.DateTimeFormat("en", { timeZone: timezone });
    return timezone || "UTC";
  } catch { return "UTC"; }
}
