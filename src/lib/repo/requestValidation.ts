export function hasClientDuration(value: unknown): boolean {
    if (!value || typeof value !== "object")
        return false;
    return Object.entries(value).some(([key, item]) => ["actualSeconds", "actual_seconds", "duration", "elapsed"].includes(key) || hasClientDuration(item));
}
