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

const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  return `${(Number(value) * 100).toFixed(2)}%`;
};

function DashboardPage() {
  const [foodRecord, setFoodRecord] = useState(null);
  const [manualInput, setManualInput] = useState(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const loadSamples = async () => {
      try {
        const response = await fetch(`${apiBase}/api/food?limit=1`);
        const json = await response.json();
        setFoodRecord(json?.data?.[0] ?? null);
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

    try {
      const toNumberOrNull = (value) => (value === "" || value === null || value === undefined ? null : Number(value));
      const response = await fetch(`${apiBase}/api/food/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mq135: toNumberOrNull(values.mq135),
          mq136: toNumberOrNull(values.mq136),
          temperature: toNumberOrNull(values.temperature),
          humidity: toNumberOrNull(values.humidity),
          h2s: toNumberOrNull(values.h2s),
          voc: toNumberOrNull(values.voc),
            amonia: toNumberOrNull(values.amonia)
        })
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Prediction failed");
      }
      setFoodRecord(json.data ?? null);
    } catch (error) {
      setManualError(error.message);
    } finally {
      setManualLoading(false);
    }
  };

  const classId = Number(foodRecord?.class ?? Number.NaN);
  const freshnessLabel = foodRecord?.class_name ?? (classId === 0 ? "Safe" : classId === 1 ? "Warning" : classId === 2 ? "Danger" : "-");
  const classProbabilities = foodRecord?.class_probabilities ?? null;
  const dangerProbabilities = classProbabilities && freshnessLabel === "Danger";

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
            <div className="grid gap-6">
              <div className={`rounded-3xl p-6 shadow-soft ${statusTone}`}>
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Current food status</p>
                <p className="mt-2 text-sm text-[var(--text-strong)]">Main storage unit</p>
                <h2 className="mt-4 text-4xl font-semibold text-[var(--accent-strong)]">{freshnessLabel}</h2>
                <p className="mt-4 text-sm text-[var(--muted)]">
                  Kualitas makanan berdasarkan pembacaan sensor dan prediksi class terbaru.
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Class</p>
                    <p className="text-xl font-semibold text-[var(--text-strong)]">
                      {formatNumber(foodRecord?.tvc)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">RSL minutes</p>
                    <p className="text-xl font-semibold text-[var(--text-strong)]">
                      {formatNumber(foodRecord?.rsl_minutes)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              <MetricCard
                title="Air quality"
                  value={formatNumber(foodRecord?.h2s)}
                unit="H2S"
                tone="bg-white/90"
                subtitle="Latest H2S reading"
              />
              <MetricCard
                title="VOC"
                  value={formatNumber(foodRecord?.voc)}
                unit="ppm"
                tone="bg-white/90"
                subtitle="Volatile organic compounds"
              />
            </div>
          </div>

            <div className="grid gap-6 md:grid-cols-3">
            <MetricCard
              title="Amonia"
                value={formatNumber(foodRecord?.amonia)}
              unit="ppm"
            />
            <MetricCard
                title="Temperature"
                value={formatNumber(foodRecord?.temperature)}
                unit="C"
            />
            <MetricCard
                title="Humidity"
                value={formatNumber(foodRecord?.humidity)}
                unit="%"
            />
          </div>

            <div className="grid gap-6 md:grid-cols-2">
              <MetricCard
                title="MQ-135"
                value={formatNumber(foodRecord?.mq_135)}
                unit="ppm"
              />
              <MetricCard
                title="MQ-136"
                value={formatNumber(foodRecord?.mq_136)}
                unit="ppm"
              />
            </div>

          <PredictionForm
            onSubmit={handleManualSubmit}
            isLoading={manualLoading}
            errorMessage={manualError}
          />

          {manualInput ? (
            <div className="rounded-3xl bg-white/80 p-6 text-sm text-[var(--muted)] shadow-soft">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Last input</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <span>MQ-135: {manualInput.mq135 || "-"}</span>
                <span>MQ-136: {manualInput.mq136 || "-"}</span>
                <span>Temperature: {manualInput.temperature || "-"}</span>
                <span>Humidity: {manualInput.humidity || "-"}</span>
                <span>H2S: {manualInput.h2s || "-"}</span>
                <span>VOC: {manualInput.voc || "-"}</span>
                <span>Amonia: {manualInput.amonia || "-"}</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
