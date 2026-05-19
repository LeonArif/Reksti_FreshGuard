import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import MetricCard from "../components/MetricCard.jsx";
import PageShell from "../components/PageShell.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { authedJson, getCurrentUser } from "../lib/predictionApi.js";

const formatNumber = (value, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return Number(value).toFixed(digits);
};

const formatTimeAgo = (value) => {
  if (!value) {
    return "never";
  }

  const timestamp = new Date(value).getTime();
  const deltaSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (deltaSeconds < 60) {
    return `${deltaSeconds}s ago`;
  }

  if (deltaSeconds < 3600) {
    return `${Math.floor(deltaSeconds / 60)}m ago`;
  }

  return `${Math.floor(deltaSeconds / 3600)}h ago`;
};

function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [latestRecord, setLatestRecord] = useState(location.state?.latestPrediction ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const [user, response] = await Promise.all([
          getCurrentUser(),
          authedJson("/api/predictions/latest")
        ]);

        if (!isMounted) {
          return;
        }

        setUserEmail(user?.email ?? "");
        setLatestRecord((currentRecord) => currentRecord ?? response?.data ?? null);
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [location.state]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const freshnessLabel = latestRecord?.class_name ?? "No prediction yet";
  const lastUpdatedLabel = formatTimeAgo(latestRecord?.created_at);

  const statusTone = useMemo(() => {
    if (freshnessLabel === "Danger") return "bg-rose-50";
    if (freshnessLabel === "Warning") return "bg-amber-50";
    return "bg-emerald-50";
  }, [freshnessLabel]);

  const classProbabilities = latestRecord?.class_probabilities ?? {};

  return (
    <PageShell
      active="dashboard"
      statusLabel="Latest prediction"
      lastUpdatedLabel={lastUpdatedLabel}
      userEmail={userEmail}
      onSignOut={handleSignOut}
    >
      <div className="rounded-[32px] bg-white/90 p-8 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Dashboard</p>
            <h1 className="mt-3 text-4xl font-semibold text-[var(--text-strong)]">
              {loading ? "Loading dashboard..." : freshnessLabel}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Dashboard menampilkan hasil prediksi terakhir milik akun yang sedang login.
              Semua data di halaman ini berasal dari history user yang sama.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/predict")}
              className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:translate-y-[-1px]"
            >
              Run Predict
            </button>
            <button
              type="button"
              onClick={() => navigate("/history")}
              className="rounded-full border border-[rgba(143,47,16,0.15)] bg-white px-6 py-3 text-sm font-semibold text-[var(--text-strong)] transition hover:bg-[var(--accent-soft)]"
            >
              Open History
            </button>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

        {!loading && !latestRecord ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[rgba(143,47,16,0.2)] bg-[var(--accent-soft)]/40 p-8 text-sm text-[var(--muted)]">
            Belum ada hasil prediksi untuk akun ini. Buka Predict untuk menjalankan prediksi pertama.
          </div>
        ) : null}

        {latestRecord ? (
          <>
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              <MetricCard title="Temperature" value={formatNumber(latestRecord.temperature)} unit="°C" />
              <MetricCard title="Humidity" value={formatNumber(latestRecord.humidity)} unit="%" />
              <MetricCard title="RSL" value={formatNumber(latestRecord.rsl_minutes)} unit="minutes" />
              <MetricCard title="MQ-135" value={formatNumber(latestRecord.mq_135)} unit="ADC" />
              <MetricCard title="MQ-136" value={formatNumber(latestRecord.mq_136)} unit="ppm" />
              <div className={`rounded-3xl p-6 shadow-soft ${statusTone}`}>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Prediction class</p>
                <h2 className="mt-4 text-4xl font-semibold text-[var(--accent-strong)]">{freshnessLabel}</h2>
                <p className="mt-3 text-sm text-[var(--muted)]">Updated {lastUpdatedLabel}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl bg-[var(--surface)] p-6 shadow-soft">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Sensor summary</p>
                <div className="mt-4 space-y-3 text-sm text-[var(--text-strong)]">
                  <p>MQ-135: {formatNumber(latestRecord.mq_135)}</p>
                  <p>MQ-136: {formatNumber(latestRecord.mq_136)}</p>
                  <p>Temperature: {formatNumber(latestRecord.temperature)} °C</p>
                  <p>Humidity: {formatNumber(latestRecord.humidity)} %</p>
                </div>
              </div>

              <div className="rounded-3xl bg-[var(--surface)] p-6 shadow-soft">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Probability</p>
                <div className="mt-4 space-y-3 text-sm text-[var(--text-strong)]">
                  <p>Safe: {classProbabilities.Safe === undefined ? "-" : `${(Number(classProbabilities.Safe) * 100).toFixed(2)}%`}</p>
                  <p>Warning: {classProbabilities.Warning === undefined ? "-" : `${(Number(classProbabilities.Warning) * 100).toFixed(2)}%`}</p>
                  <p>Danger: {classProbabilities.Danger === undefined ? "-" : `${(Number(classProbabilities.Danger) * 100).toFixed(2)}%`}</p>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </PageShell>
  );
}

export default DashboardPage;
