import { describe, expect, it } from "vitest";
import { loginSchema, registrationSchema } from "./schemas";

const registration = { firstName: "Alex", lastName: "Sample", email: "alex@example.com", username: "Alex_123", password: "password-test-123" };

describe("auth request validation", () => {
  it("normalizes usernames without changing passwords", () => {
    expect(loginSchema.parse({ username: " Alex_123 ", password: " untouched " })).toEqual({ username: "alex_123", password: " untouched " });
    expect(registrationSchema.parse(registration).username).toBe("alex_123");
  });
  it.each(["", "a", "a/b", "user@example.com", "a".repeat(31)])("rejects unsafe username %s", (username) => {
    expect(loginSchema.safeParse({ username, password: "password" }).success).toBe(false);
  });
  it.each(["firstName", "lastName", "email", "username", "password"])("requires registration field %s", (field) => {
    expect(registrationSchema.safeParse({ ...registration, [field]: "" }).success).toBe(false);
  });
  it("rejects weak passwords and unexpected privilege fields", () => {
    expect(registrationSchema.safeParse({ ...registration, password: "123" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...registration, role: "admin" }).success).toBe(false);
  });
});
