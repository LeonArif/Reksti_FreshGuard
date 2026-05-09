import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import { supabase } from "./lib/supabaseClient.js";

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let authStateChanged = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      if (authStateChanged) {
        setLoading(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authStateChanged = true;
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

    if (session && currentPath !== "/dashboard") {
      window.location.replace("/dashboard");
      return;
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
          element={session ? <Navigate to="/dashboard" /> : <LoginPage />}
        />
        <Route
          path="/dashboard"
          element={session ? <DashboardPage /> : <Navigate to="/login" />}
        />
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
