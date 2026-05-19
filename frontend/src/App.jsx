import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import PredictPage from "./pages/PredictPage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import { supabase } from "./lib/supabaseClient.js";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const currentPath = window.location.pathname;
    const hasOAuthHash = window.location.hash.includes("access_token=");

    if (session && hasOAuthHash) {
      window.history.replaceState({}, document.title, currentPath);
    }

    if (!session && currentPath !== "/login" && !hasOAuthHash) {
      window.location.replace("/login");
    }
  }, [loading, session]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-sm text-[var(--muted)]">
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/predict" /> : <LoginPage />}
        />
        <Route
          path="/predict"
          element={session ? <PredictPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/dashboard"
          element={session ? <DashboardPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/history"
          element={session ? <HistoryPage /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to={session ? "/predict" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
