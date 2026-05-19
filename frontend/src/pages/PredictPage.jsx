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

  // Manual input states
  const [mq135, setMq135] = useState(250);
  const [mq136, setMq136] = useState(0.5);
  const [temperatureInput, setTemperatureInput] = useState(25);
  const [humidityInput, setHumidityInput] = useState(50);
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);

  const handleManualSubmit = async () => {
    setIsManualSubmitting(true);
    setMessage("Mengirim data manual untuk prediksi...");

    try {
      const payload = {
        mq135: Number(mq135),
        mq136: Number(mq136),
        temperature: Number(temperatureInput),
        humidity: Number(humidityInput)
      };

      const response = await authedJson("/api/food/manual", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setMessage("Prediksi manual berhasil disimpan. Mengarahkan ke dashboard...");
      navigate("/dashboard", { state: { latestPrediction: response?.data ?? null } });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsManualSubmitting(false);
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

        <div className="mt-8 rounded-2xl border border-[rgba(143,47,16,0.06)] bg-[var(--surface)] p-6">
          <p className="text-sm font-semibold text-[var(--text-strong)]">Manual input</p>
          <p className="mt-1 text-xs text-[var(--muted)]">Masukkan sensor secara manual lalu kirim prediksi.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col text-sm">
              <span className="text-xs text-[var(--muted)]">MQ-135</span>
              <input
                type="number"
                value={mq135}
                onChange={(e) => setMq135(e.target.value)}
                className="mt-2 rounded-lg border px-3 py-2"
                step="any"
              />
            </label>

            <label className="flex flex-col text-sm">
              <span className="text-xs text-[var(--muted)]">MQ-136</span>
              <input
                type="number"
                value={mq136}
                onChange={(e) => setMq136(e.target.value)}
                className="mt-2 rounded-lg border px-3 py-2"
                step="any"
              />
            </label>

            <label className="flex flex-col text-sm">
              <span className="text-xs text-[var(--muted)]">Temperature (°C)</span>
              <input
                type="number"
                value={temperatureInput}
                onChange={(e) => setTemperatureInput(e.target.value)}
                className="mt-2 rounded-lg border px-3 py-2"
                step="any"
              />
            </label>

            <label className="flex flex-col text-sm">
              <span className="text-xs text-[var(--muted)]">Humidity (%)</span>
              <input
                type="number"
                value={humidityInput}
                onChange={(e) => setHumidityInput(e.target.value)}
                className="mt-2 rounded-lg border px-3 py-2"
                step="any"
              />
            </label>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleManualSubmit}
              disabled={isManualSubmitting}
              className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-semibold text-white shadow-glow transition hover:translate-y-[-1px] disabled:opacity-60"
            >
              {isManualSubmitting ? "Submitting..." : "Submit Manual"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMq135(250);
                setMq136(0.5);
                setTemperatureInput(25);
                setHumidityInput(50);
              }}
              className="rounded-full border border-[rgba(143,47,16,0.15)] bg-white px-6 py-2 text-sm font-semibold text-[var(--text-strong)] transition hover:bg-[var(--accent-soft)]"
            >
              Reset
            </button>
          </div>
        </div>

        {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}
      </div>
    </PageShell>
  );
}

export default PredictPage;
