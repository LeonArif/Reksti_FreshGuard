import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "never";

  const seconds = Math.floor((Date.now() - time) / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(value).toLocaleString();
};

const sortByCreatedAt = (items) =>
  [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

const LineChart = ({ title, values, unit }) => {
  const width = 640;
  const height = 180;
  const padding = 24;

  if (!values.length) {
    return (
      <div className="rounded-3xl bg-[var(--surface)] p-6 shadow-soft">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{title}</p>
        <p className="mt-6 text-sm text-[var(--muted)]">Belum ada data historis.</p>
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((value, index) => {
      const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const latest = values[values.length - 1];

  return (
    <div className="rounded-3xl bg-[var(--surface)] p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">
            {formatNumber(latest)} {unit}
          </p>
        </div>
        <div className="text-right text-xs text-[var(--muted)]">
          <p>Min {formatNumber(min)}</p>
          <p>Max {formatNumber(max)}</p>
        </div>
      </div>

      <div className="mt-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full">
          <rect x="0" y="0" width={width} height={height} rx="18" fill="rgba(255,255,255,0.5)" />
          <polyline
            fill="none"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points}
          />
        </svg>
      </div>
    </div>
  );
};

function DashboardPage() {
  const navigate = useNavigate();

  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const [user, response] = await Promise.all([
          getCurrentUser(),
          authedJson("/api/predictions/history?limit=200")
        ]);

        if (!isMounted) {
          return;
        }

        setUserEmail(user?.email ?? "");
        setHistoryItems(response?.data ?? []);
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
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const sortedHistory = useMemo(() => sortByCreatedAt(historyItems), [historyItems]);
  const latestRecord = sortedHistory[sortedHistory.length - 1] ?? null;
  const lastUpdatedLabel = formatTimeAgo(latestRecord?.created_at);

  const classCounts = useMemo(() => {
    return sortedHistory.reduce(
      (acc, item) => {
        const key = item.class_name ?? "";
        if (key === "Safe") acc.Safe += 1;
        if (key === "Warning") acc.Warning += 1;
        if (key === "Danger") acc.Danger += 1;
        return acc;
      },
      { Safe: 0, Warning: 0, Danger: 0 }
    );
  }, [sortedHistory]);

  const maxClassCount = Math.max(classCounts.Safe, classCounts.Warning, classCounts.Danger, 1);

  return (
    <PageShell
      active="dashboard"
      statusLabel="Historical overview"
      lastUpdatedLabel={lastUpdatedLabel}
      userEmail={userEmail}
      onSignOut={handleSignOut}
    >
      <div className="rounded-[32px] bg-white/90 p-8 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Dashboard</p>
            <h1 className="mt-3 text-4xl font-semibold text-[var(--text-strong)]">
              {loading ? "Loading dashboard..." : "Historical analytics"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Dashboard menampilkan ringkasan historis dari seluruh prediction user yang sedang login.
              Grafik di bawah mengambil data dari history yang sama.
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

        {!loading && historyItems.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[rgba(143,47,16,0.2)] bg-[var(--accent-soft)]/40 p-8 text-sm text-[var(--muted)]">
            Belum ada hasil prediksi untuk akun ini. Buka Predict untuk menjalankan prediksi pertama.
          </div>
        ) : null}

        {historyItems.length > 0 ? (
          <>
            <div className="mt-8 grid gap-6">
              <div className="rounded-3xl bg-[var(--surface)] p-6 shadow-soft">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Class distribution</p>
                    <h2 className="mt-2 text-2xl font-semibold text-[var(--text-strong)]">Total per class</h2>
                  </div>
                  <p className="text-xs text-[var(--muted)]">Updated {lastUpdatedLabel}</p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    { label: "Safe", value: classCounts.Safe, tone: "bg-emerald-300" },
                    { label: "Warning", value: classCounts.Warning, tone: "bg-amber-300" },
                    { label: "Danger", value: classCounts.Danger, tone: "bg-rose-300" }
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-white/70 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[var(--text-strong)]">{item.label}</p>
                        <span className="text-sm text-[var(--muted)]">{item.value}</span>
                      </div>
                      <div className="mt-4 flex h-28 items-end rounded-xl bg-[var(--accent-soft)]/60">
                        <div
                          className={`w-full rounded-xl ${item.tone}`}
                          style={{ height: `${Math.round((item.value / maxClassCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <LineChart
                  title="Temperature"
                  values={sortedHistory.map((item) => Number(item.temperature))}
                  unit="°C"
                />
                <LineChart
                  title="Humidity"
                  values={sortedHistory.map((item) => Number(item.humidity))}
                  unit="%"
                />
                <LineChart
                  title="RSL"
                  values={sortedHistory.map((item) => Number(item.rsl_minutes))}
                  unit="min"
                />
                <LineChart
                  title="MQ-135"
                  values={sortedHistory.map((item) => Number(item.mq_135))}
                  unit="ADC"
                />
                <LineChart
                  title="MQ-136"
                  values={sortedHistory.map((item) => Number(item.mq_136))}
                  unit="ppm"
                />
              </div>
            </div>
          </>
        ) : null}

      </div>
    </PageShell>
  );
}

export default DashboardPage;
