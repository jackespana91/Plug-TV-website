import { Link, NavLink, Outlet } from "react-router-dom";
import { Gamepad2, Tv } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "px-4 py-2 rounded-full text-sm font-medium transition-colors",
    isActive ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"
  );

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary text-primary-foreground group-hover:animate-pulse-glow">
              <Tv className="w-5 h-5" />
            </span>
            <span className="font-display text-xl tracking-wide">
              PLUG<span className="text-primary">TV</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/games" className={navLinkClass}>
              <span className="inline-flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4" /> Games
              </span>
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        <p>
          © {new Date().getFullYear()} Plug TV — Where the Next Wave Breaks
        </p>
      </footer>
    </div>
  );
}
