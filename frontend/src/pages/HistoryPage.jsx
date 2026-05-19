import { useEffect, useState } from "react";
import PageShell from "../components/PageShell.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { authedJson, getCurrentUser } from "../lib/predictionApi.js";

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }

  return `${(Number(value) * 100).toFixed(2)}%`;
};

function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [user, response] = await Promise.all([
          getCurrentUser(),
          authedJson("/api/predictions/history?limit=100")
        ]);

        if (!isMounted) {
          return;
        }

        setUserEmail(user?.email ?? "");
        setItems(response?.data ?? []);
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

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <PageShell
      active="history"
      statusLabel="Prediction history"
      lastUpdatedLabel={items[0]?.created_at ? formatDateTime(items[0].created_at) : "never"}
      userEmail={userEmail}
      onSignOut={handleSignOut}
    >
      <div className="rounded-[32px] bg-white/90 p-8 shadow-soft">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">History</p>
        <h1 className="mt-3 text-4xl font-semibold text-[var(--text-strong)]">Prediction history</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Halaman ini menampilkan seluruh riwayat prediksi milik akun yang sedang login.
          Data di sini terpisah per user sehingga tiap akun punya histori yang berbeda.
        </p>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

        {loading ? (
          <div className="mt-8 rounded-3xl bg-[var(--accent-soft)]/60 p-8 text-sm text-[var(--muted)]">
            Loading history...
          </div>
        ) : null}

        {!loading && items.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[rgba(143,47,16,0.2)] bg-[var(--accent-soft)]/40 p-8 text-sm text-[var(--muted)]">
            Belum ada history prediksi. Jalankan prediction pertama dari halaman Predict.
          </div>
        ) : null}

        <div className="mt-8 grid gap-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-3xl bg-[var(--surface)] p-6 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    {formatDateTime(item.created_at)}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-[var(--text-strong)]">
                    {item.class_name}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">Source: {item.source}</p>
                </div>
                <div className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-sm font-semibold text-[var(--accent-strong)]">
                  RSL {Number(item.rsl_minutes).toFixed(2)} min
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">MQ-135</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">{Number(item.mq_135).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">MQ-136</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">{Number(item.mq_136).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Temperature</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">{Number(item.temperature).toFixed(2)} °C</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Humidity</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">{Number(item.humidity).toFixed(2)} %</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                <span>Safe {formatPercent(item.class_probabilities?.Safe)}</span>
                <span>Warning {formatPercent(item.class_probabilities?.Warning)}</span>
                <span>Danger {formatPercent(item.class_probabilities?.Danger)}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

export default HistoryPage;
