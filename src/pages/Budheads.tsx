import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BudheadsGame } from "@/game/budheads/engine";

export default function Budheads() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new BudheadsGame(canvas);
    return () => game.destroy();
  }, []);

  return (
    <div className="fixed inset-0 bg-[#08080c] overflow-hidden">
      <div className="absolute inset-0">
        <canvas ref={canvasRef} className="block touch-none select-none" />
      </div>
      <Link
        to="/games"
        className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur transition-colors hover:bg-white/20"
      >
        <ArrowLeft className="w-4 h-4" /> Exit
      </Link>
    </div>
  );
}
