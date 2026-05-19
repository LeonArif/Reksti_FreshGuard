import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { authedJson, getCurrentUser } from "../lib/predictionApi.js";

function PredictPage() {
  const navigate = useNavigate();

  const [isPredicting, setIsPredicting] = useState(false);
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    let isMounted = true;

    getCurrentUser().then((user) => {
      if (isMounted) {
        setUserEmail(user?.email ?? "");
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handlePredict = async () => {
    setIsPredicting(true);
    setMessage("Menghubungi device untuk memulai prediksi...");

    try {
      const response = await authedJson("/api/food/predict", { method: "POST" });
      setMessage("Prediksi berhasil disimpan. Mengarahkan ke dashboard...");
      navigate("/dashboard", { state: { latestPrediction: response?.data ?? null } });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <PageShell
      active="predict"
      statusLabel="Ready to predict"
      lastUpdatedLabel="on demand"
      userEmail={userEmail}
      onSignOut={handleSignOut}
    >
      <div className="rounded-[32px] bg-white/90 p-8 shadow-soft">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Predict</p>
        <h1 className="mt-3 text-4xl font-semibold text-[var(--text-strong)]">Run a new prediction</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Halaman ini hanya dipakai untuk menjalankan prediksi. Tekan tombol di bawah untuk
          meminta device mengirim data terbaru, lalu hasilnya akan otomatis tersimpan ke history
          dan bisa dibuka di Dashboard.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={handlePredict}
            disabled={isPredicting}
            className="rounded-full bg-[var(--accent)] px-7 py-3 text-sm font-semibold text-white shadow-glow transition hover:translate-y-[-1px] disabled:opacity-60"
          >
            {isPredicting ? "Predicting..." : "Predict"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/history")}
            className="rounded-full border border-[rgba(143,47,16,0.15)] bg-white px-7 py-3 text-sm font-semibold text-[var(--text-strong)] transition hover:bg-[var(--accent-soft)]"
          >
            View History
          </button>
        </div>

        <div className="mt-6 rounded-3xl bg-[var(--accent-soft)]/70 p-5 text-sm text-[var(--text-strong)]">
          <p className="font-semibold">What happens next</p>
          <ul className="mt-3 space-y-2 text-[var(--muted)]">
            <li>1. Device diminta mengirim data sensor terbaru.</li>
            <li>2. Backend menghitung hasil prediksi.</li>
            <li>3. Hasil disimpan untuk akun yang sedang login.</li>
            <li>4. Dashboard dan History menampilkan data yang sama untuk akun ini.</li>
          </ul>
        </div>

        {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}
      </div>
    </PageShell>
  );
}

export default PredictPage;
