import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import TopBar from "../components/TopBar.jsx";
import MetricCard from "../components/MetricCard.jsx";
import PredictionForm from "../components/PredictionForm.jsx";
import { supabase } from "../lib/supabaseClient.js";

const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:3001";

const formatNumber = (value, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  return Number(value).toFixed(digits);
};

function DashboardPage() {
  const [tvcSample, setTvcSample] = useState(null);
  const [predictSample, setPredictSample] = useState(null);
  const [manualInput, setManualInput] = useState(null);
  const [manualResult, setManualResult] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const loadSamples = async () => {
      try {
        const tvcResponse = await fetch(`${apiBase}/api/tvc?limit=1`);
        const tvcJson = await tvcResponse.json();
        setTvcSample(tvcJson?.data?.[0] ?? null);

        const predictResponse = await fetch(`${apiBase}/api/predict?limit=1`);
        const predictJson = await predictResponse.json();
        setPredictSample(predictJson?.data?.[0] ?? null);
      } catch (error) {
        console.error("Failed to load samples", error);
      }
    };

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data?.user?.email ?? "");
    };

    loadSamples();
    loadUser();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleManualSubmit = async (values) => {
    setManualInput(values);
    setManualLoading(true);
    setManualError("");
    setManualResult(null);

    try {
      const response = await fetch(`${apiBase}/api/predict/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mq135: values.mq135,
          mq136: values.mq136,
          temperature: values.temperature,
          humidity: values.humidity
        })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Prediction failed");
      }
      setManualResult(json);
    } catch (error) {
      setManualError(error.message);
    } finally {
      setManualLoading(false);
    }
  };

  const freshnessLabel = predictSample?.freshness_label ?? "-";

  const statusTone = useMemo(() => {
    if (freshnessLabel === "Danger") return "bg-rose-50";
    if (freshnessLabel === "Warning") return "bg-amber-50";
    return "bg-emerald-50";
  }, [freshnessLabel]);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[240px,1fr]">
        <Sidebar active="dashboard" />

        <div className="flex flex-col gap-6">
          <TopBar
            statusLabel="ESP32 connected via Wi-Fi"
            userEmail={userEmail}
            onSignOut={handleSignOut}
          />

          <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
            <div className={`rounded-3xl p-6 shadow-soft ${statusTone}`}>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Current food status</p>
              <p className="mt-2 text-sm text-[var(--text-strong)]">Main storage unit</p>
              <h2 className="mt-4 text-4xl font-semibold text-[var(--accent-strong)]">{freshnessLabel}</h2>
              <p className="mt-4 text-sm text-[var(--muted)]">
                Kualitas makanan berdasarkan pembacaan sensor dan prediksi TVC terbaru.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">TVC</p>
                  <p className="text-xl font-semibold text-[var(--text-strong)]">
                    {formatNumber(tvcSample?.tvc)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">RSL minutes</p>
                  <p className="text-xl font-semibold text-[var(--text-strong)]">
                    {formatNumber(predictSample?.rsl_minutes)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              <MetricCard
                title="Air quality"
                value={formatNumber(tvcSample?.h2s)}
                unit="H2S"
                tone="bg-white/90"
                subtitle="Latest H2S reading"
              />
              <MetricCard
                title="VOC"
                value={formatNumber(tvcSample?.voc)}
                unit="ppm"
                tone="bg-white/90"
                subtitle="Volatile organic compounds"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <MetricCard
              title="Amonia"
              value={formatNumber(tvcSample?.amonia)}
              unit="ppm"
            />
            <MetricCard
              title="Prob Safe"
              value={formatNumber(predictSample?.prob_safe, 3)}
            />
            <MetricCard
              title="Prob Warning"
              value={formatNumber(predictSample?.prob_warning, 3)}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <MetricCard
              title="Prob Danger"
              value={formatNumber(predictSample?.prob_danger, 3)}
            />
            <MetricCard
              title="Temperature"
              value={formatNumber(tvcSample?.temperature)}
              unit="C"
            />
          </div>

          <PredictionForm
            onSubmit={handleManualSubmit}
            isLoading={manualLoading}
            errorMessage={manualError}
          />

          {manualInput ? (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl bg-white/80 p-6 text-sm text-[var(--muted)] shadow-soft">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Last input</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <span>MQ-135: {manualInput.mq135 || "-"}</span>
                  <span>MQ-136: {manualInput.mq136 || "-"}</span>
                  <span>Temperature: {manualInput.temperature || "-"}</span>
                  <span>Humidity: {manualInput.humidity || "-"}</span>
                </div>
              </div>
              <div className="rounded-3xl bg-white/80 p-6 text-sm text-[var(--muted)] shadow-soft">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Manual prediction</p>
                {manualResult ? (
                  <div className="mt-3 grid gap-2">
                    <span>Class: {manualResult.class_name}</span>
                    <span>RSL minutes: {formatNumber(manualResult.rsl_minutes)}</span>
                    <span>Prob Safe: {formatNumber(manualResult.probabilities?.Safe, 3)}</span>
                    <span>Prob Warning: {formatNumber(manualResult.probabilities?.Warning, 3)}</span>
                    <span>Prob Danger: {formatNumber(manualResult.probabilities?.Danger, 3)}</span>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-[var(--muted)]">Belum ada hasil.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
