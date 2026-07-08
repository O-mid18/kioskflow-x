export const CATEGORY_MAP: Record<string, { color: string; bg: string; emoji: string; label: string }> = {
  Energy:    { color: "#d97706", bg: "#fef3c7", emoji: "⚡",  label: "Energy" },
  Cola:      { color: "#2563eb", bg: "#dbeafe", emoji: "🥤",  label: "Cola" },
  Bio:       { color: "#16a34a", bg: "#dcfce7", emoji: "🌿",  label: "Bio" },
  Snacks:    { color: "#9333ea", bg: "#f3e8ff", emoji: "🍬",  label: "Snacks" },
  Limo:      { color: "#db2777", bg: "#fce7f3", emoji: "🍋",  label: "Limo" },
  Getränke:  { color: "#0891b2", bg: "#cffafe", emoji: "💧",  label: "Getränke" },
  Kaffee:    { color: "#78350f", bg: "#fef3c7", emoji: "☕",  label: "Kaffee" },
  Wasser:    { color: "#0284c7", bg: "#e0f2fe", emoji: "💧",  label: "Wasser" },
  Alkohol:   { color: "#b45309", bg: "#fef3c7", emoji: "🍺",  label: "Alkohol" },
  Tabak:     { color: "#4b5563", bg: "#f3f4f6", emoji: "🚬",  label: "Tabak" },
  Sonstiges: { color: "#e8521a", bg: "#fff1ec", emoji: "📦",  label: "Sonstiges" },
};

export const CATEGORIES = Object.keys(CATEGORY_MAP);

export const DEFAULT_CATEGORY = { color: "#e8521a", bg: "#fff1ec", emoji: "📦", label: "Sonstiges" };

export function getCategoryStyle(category?: string | null) {
  return CATEGORY_MAP[category || ""] ?? DEFAULT_CATEGORY;
}
