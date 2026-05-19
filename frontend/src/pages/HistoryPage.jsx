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

function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [user, response] = await Promise.all([
          getCurrentUser(),
          authedJson("/api/predictions/history?limit=200")
        ]);

        if (!isMounted) {
          return;
        }

        setUserEmail(user?.email ?? "");
        setItems(response?.data ?? []);
        setCurrentPage(1);
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

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const currentItems = items.slice(startIndex, startIndex + pageSize);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
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

        {!loading && items.length > 0 ? (
          <div className="mt-8 rounded-3xl border border-[rgba(143,47,16,0.1)] bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[rgba(143,47,16,0.08)] text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Source</th>
                    <th className="px-6 py-4">RSL</th>
                    <th className="px-6 py-4">Temp</th>
                    <th className="px-6 py-4">Humidity</th>
                    <th className="px-6 py-4">MQ-135</th>
                    <th className="px-6 py-4">MQ-136</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-[var(--text-strong)]">
                  {currentItems.map((item) => (
                    <tr key={item.id} className="border-b border-[rgba(143,47,16,0.06)] last:border-none">
                      <td className="px-6 py-4 text-[var(--muted)]">{formatDateTime(item.created_at)}</td>
                      <td className="px-6 py-4 font-semibold text-[var(--accent-strong)]">{item.class_name}</td>
                      <td className="px-6 py-4 text-[var(--muted)]">{item.source}</td>
                      <td className="px-6 py-4">{Number(item.rsl_minutes).toFixed(2)} min</td>
                      <td className="px-6 py-4">{Number(item.temperature).toFixed(2)} °C</td>
                      <td className="px-6 py-4">{Number(item.humidity).toFixed(2)} %</td>
                      <td className="px-6 py-4">{Number(item.mq_135).toFixed(2)}</td>
                      <td className="px-6 py-4">{Number(item.mq_136).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[rgba(143,47,16,0.08)] px-6 py-4 text-sm text-[var(--muted)]">
              <span>
                Showing {startIndex + 1}-{Math.min(startIndex + pageSize, items.length)} of {items.length}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={safePage === 1}
                  className="rounded-full border border-[rgba(143,47,16,0.2)] px-4 py-2 text-sm font-semibold text-[var(--text-strong)] disabled:opacity-50"
                >
                  Prev
                </button>
                <span>Page {safePage} / {totalPages}</span>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={safePage === totalPages}
                  className="rounded-full border border-[rgba(143,47,16,0.2)] px-4 py-2 text-sm font-semibold text-[var(--text-strong)] disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </PageShell>
  );
}

export default HistoryPage;
