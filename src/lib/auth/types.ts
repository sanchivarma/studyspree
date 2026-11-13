import type { TranslationKey } from "@/translations";

export type AuthResult = { status: "success" | "error"; message?: TranslationKey; fieldErrors?: import("./schemas").RegistrationErrors; navigate?: string; external?: boolean };
export type AuthOperation = "login" | "register" | "reset" | "updatePassword" | "logout" | "google" | "facebook" | "magicLink" | "onboard";
