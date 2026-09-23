export type Genre = { tag: string; label: string; emoji: string; color: string };

// Curated popular genres — `tag` maps to a radio-browser tag search.
export const GENRES: Genre[] = [
  { tag: "pop", label: "Pop", emoji: "🎤", color: "#ec4899" },
  { tag: "rock", label: "Rock", emoji: "🎸", color: "#ef4444" },
  { tag: "hip hop", label: "Hip-Hop", emoji: "🎧", color: "#8b5cf6" },
  { tag: "r&b", label: "R&B / Soul", emoji: "🎙", color: "#a855f7" },
  { tag: "electronic", label: "Electronic", emoji: "🎛", color: "#06b6d4" },
  { tag: "dance", label: "Dance", emoji: "💃", color: "#22d3ee" },
  { tag: "jazz", label: "Jazz", emoji: "🎷", color: "#3b82f6" },
  { tag: "classical", label: "Classical", emoji: "🎻", color: "#6366f1" },
  { tag: "afrobeats", label: "Afrobeats", emoji: "🥁", color: "#f59e0b" },
  { tag: "reggae", label: "Reggae", emoji: "🟢", color: "#22c55e" },
  { tag: "country", label: "Country", emoji: "🤠", color: "#eab308" },
  { tag: "latin", label: "Latin", emoji: "🪇", color: "#f43f5e" },
  { tag: "metal", label: "Metal", emoji: "🤘", color: "#94a3b8" },
  { tag: "oldies", label: "Oldies", emoji: "📻", color: "#fb7185" },
  { tag: "ambient", label: "Ambient", emoji: "🌙", color: "#818cf8" },
  { tag: "gospel", label: "Gospel", emoji: "🙏", color: "#fbbf24" },
  { tag: "news", label: "News", emoji: "📰", color: "#10b981" },
  { tag: "chillout", label: "Chillout", emoji: "🛋", color: "#2dd4bf" },
];
