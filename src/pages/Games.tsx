import { Link } from "react-router-dom";
import { Lock, Play } from "lucide-react";

const games = [
  {
    slug: "budheads",
    title: "BUDHEADS",
    emoji: "🌿",
    tagline: "Catch the harvest. Stack the combo. Dodge the rot.",
    status: "live" as const,
  },
  {
    slug: "wave-runner",
    title: "WAVE RUNNER",
    emoji: "🌊",
    tagline: "Surf the next wave before it breaks.",
    status: "soon" as const,
  },
  {
    slug: "plug-stacker",
    title: "PLUG STACKER",
    emoji: "🔌",
    tagline: "Stack the plugs sky high without dropping the connection.",
    status: "soon" as const,
  },
];

export default function Games() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-display text-4xl md:text-5xl mb-3">
        THE <span className="text-primary text-glow-green">ARCADE</span>
      </h1>
      <p className="text-muted mb-12">
        Original games by Plug TV. No downloads, no sign-ups — just play.
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => (
          <div
            key={game.slug}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary"
          >
            <div className="text-6xl mb-6 transition-transform group-hover:scale-110 select-none" aria-hidden>
              {game.emoji}
            </div>
            <h2 className="font-display text-2xl mb-2">{game.title}</h2>
            <p className="text-sm text-muted mb-6 min-h-10">{game.tagline}</p>
            {game.status === "live" ? (
              <Link
                to={`/games/${game.slug}`}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-display text-primary-foreground transition-transform hover:scale-105"
              >
                <Play className="w-4 h-4" /> PLAY NOW
              </Link>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm text-muted">
                <Lock className="w-4 h-4" /> Coming soon
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
