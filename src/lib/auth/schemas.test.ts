import { describe, expect, it } from "vitest";
import { loginSchema, registrationSchema, registrationFormSchema, registrationErrors } from "./schemas";

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
  it("normalizes names and email while preserving password whitespace", () => {
    expect(registrationSchema.parse({ ...registration, firstName: " Alex ", email: " ALEX@example.com ", password: " password " })).toMatchObject({ firstName: "Alex", email: "alex@example.com", password: " password " });
  });
  it("reports all invalid fields and mismatched confirmation", () => {
    const parsed = registrationFormSchema.safeParse({ ...registration, firstName: "  ", email: "invalid", confirmPassword: "different" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(registrationErrors(parsed.error)).toEqual({ firstName: "register.firstNameInvalid", email: "register.emailInvalid", confirmPassword: "register.passwordMismatch" });
  });
  it.each([8, 64])("accepts a %i-character password with matching confirmation", length => {
    expect(registrationFormSchema.safeParse({ ...registration, password: "a".repeat(length), confirmPassword: "a".repeat(length) }).success).toBe(true);
  });
  it("rejects oversized names and passwords", () => {
    expect(registrationSchema.safeParse({ ...registration, lastName: "a".repeat(81), password: "a".repeat(65) }).success).toBe(false);
  });
});
