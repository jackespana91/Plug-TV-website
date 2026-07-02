import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-32 text-center">
      <h1 className="font-display text-6xl mb-4 text-primary text-glow-green">404</h1>
      <p className="text-muted mb-8">This channel doesn't exist.</p>
      <Link
        to="/"
        className="inline-flex rounded-full bg-primary px-6 py-3 font-display text-primary-foreground"
      >
        BACK HOME
      </Link>
    </div>
  );
}
