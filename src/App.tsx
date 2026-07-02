import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Games from "@/pages/Games";
import Budheads from "@/pages/Budheads";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/games" element={<Games />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        {/* The game runs full-bleed outside the site chrome */}
        <Route path="/games/budheads" element={<Budheads />} />
      </Routes>
    </BrowserRouter>
  );
}
