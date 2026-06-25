import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppStateProvider } from "./state/AppState";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import StyleHubPage from "./pages/StyleHubPage";
import MatchabilityPage from "./pages/MatchabilityPage";
import EventPage from "./pages/EventPage";
import LoginPage from "./pages/LoginPage";

import { useEffect } from "react";
import { wakeUpServer } from "./utils/apiClient";

export default function App() {
  useEffect(() => {
    // Fire a background ping to wake up the AI server and pre-load heavy models
    wakeUpServer();
  }, []);

  return (
    <BrowserRouter>
      <AppStateProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/style" element={<StyleHubPage />} />
          <Route path="/matchability" element={<MatchabilityPage />} />
          <Route path="/event" element={<EventPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </AppStateProvider>
    </BrowserRouter>
  );
}
