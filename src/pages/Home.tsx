import { Link } from "react-router-dom";
import { ArrowRight, Gamepad2, Play, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-24 md:py-36 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-muted mb-8">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            Streams · Culture · Original Games
          </p>
          <h1 className="font-display text-5xl md:text-7xl leading-tight">
            WHERE THE{" "}
            <span className="text-primary text-glow-green">NEXT WAVE</span>
            <br />
            <span className="text-accent text-glow-purple">BREAKS</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
            Plug TV is the home of underground culture — and now, original arcade
            games built for the plug. Jump in and chase the high score.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/games/budheads"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 font-display text-lg text-primary-foreground transition-transform hover:scale-105 active:scale-95"
            >
              <Play className="w-5 h-5" /> PLAY BUDHEADS
            </Link>
            <Link
              to="/games"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-8 py-4 font-medium text-foreground transition-colors hover:border-primary"
            >
              <Gamepad2 className="w-5 h-5" /> All Games
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured game strip */}
      <section className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-16 grid gap-10 md:grid-cols-2 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary mb-3">
              Featured Game
            </p>
            <h2 className="font-display text-4xl mb-4">BUDHEADS</h2>
            <p className="text-muted leading-relaxed mb-6">
              Buddy dropped the harvest. Catch every falling bud, stack combos,
              grab power-ups and dodge the rot — the longer you survive, the
              wilder it gets. Full combo system, frenzy mode, golden buds and a
              high-score board that begs to be beaten.
            </p>
            <ul className="space-y-2 text-sm text-muted mb-8">
              <li>🔥 Combo multipliers up to ×10</li>
              <li>⚡ Magnet, slow-mo &amp; frenzy power-ups</li>
              <li>📱 Plays perfectly on desktop and mobile</li>
            </ul>
            <Link
              to="/games/budheads"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-display text-accent-foreground transition-transform hover:scale-105"
            >
              <Play className="w-4 h-4" /> START GAME
            </Link>
          </div>
          <div className="grid place-items-center">
            <div className="animate-float text-[10rem] leading-none select-none" aria-hidden>
              🌿
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
