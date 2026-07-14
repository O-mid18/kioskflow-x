import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function translateAuthError(message: string | undefined | null): string {
  if (!message) return "Registrierung fehlgeschlagen. Bitte versuche es erneut.";
  const m = message.toLowerCase();

  if (m.includes("security purposes") || m.includes("rate limit")) {
    return "Bitte warte kurz (ca. 1 Minute) und versuche es dann erneut.";
  }
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already")) {
    return "Für diese E-Mail-Adresse existiert bereits ein Konto. Bitte einloggen.";
  }
  if (m.includes("password") && (m.includes("short") || m.includes("at least") || m.includes("weak"))) {
    return "Das Passwort ist zu kurz oder zu einfach — bitte mindestens 6 Zeichen wählen.";
  }
  if (m.includes("invalid") && m.includes("email")) {
    return "Diese E-Mail-Adresse scheint ungültig zu sein.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Verbindungsproblem — bitte prüfe deine Internetverbindung und versuche es erneut.";
  }
  if (m.includes("invalid login credentials") || m.includes("invalid email or password")) {
    return "E-Mail-Adresse oder Passwort ist falsch.";
  }
  return message;
}
