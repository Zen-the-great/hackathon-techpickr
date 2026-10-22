
import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import { initBotAdapter } from "./lib/botAdapter";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import TechBotWidget from "./components/TechBot";

import Home from "./pages/Home";
import WhyUs from "./pages/WhyUs";
import Questionnaire from "./pages/Questionnaire";
import Results from "./pages/Results";
import PcPreview from "./pages/PcPreview";
import Community from "./pages/Community";
import Login from "./pages/Login";
import MyRecommendations from "./pages/MyRecommendations";
import ProtectedRoute from "./components/ProtectedRoute";

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);

      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }

    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
}

function BuildRedirect() {
  const location = useLocation();
  return <Navigate to="/build" replace state={location.state} />;
}

function App() {
  useEffect(() => {
    const adapter = initBotAdapter({
      name: "TechBot",
      status: "ready",
      readiness: "backend_proxy_ready",
      configured: true,
    });

    return () => adapter.destroy();
  }, []);

  return (
    <>
      <ScrollToTop />

      <Navbar />

      <Routes>
        {/* Existing laptop recommendation pages */}
        <Route path="/" element={<Home />} />
        <Route path="/why-us" element={<WhyUs />} />
        <Route path="/build" element={<Questionnaire />} />
        <Route path="/results" element={<Results />} />

        {/* Existing 3D PC preview */}
        <Route path="/3d" element={<PcPreview />} />

        <Route path="/pc-builder" element={<BuildRedirect />} />
        <Route path="/pc-build" element={<BuildRedirect />} />

        {/* Existing community page */}
        <Route path="/community" element={<Community />} />

        <Route path="/login" element={<Login />} />
        <Route
          path="/my-recommendations"
          element={
            <ProtectedRoute>
              <MyRecommendations />
            </ProtectedRoute>
          }
        />
      </Routes>

      <Footer />
      <TechBotWidget />
    </>
  );
}

export default App;
