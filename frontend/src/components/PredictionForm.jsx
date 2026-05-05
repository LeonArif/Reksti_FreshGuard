import PropTypes from "prop-types";
import { useState } from "react";

const emptyValues = {
  mq135: "",
  mq136: "",
  temperature: "",
  humidity: "",
  h2s: "",
  voc: "",
  amonia: ""
};

function PredictionForm({ onSubmit, isLoading, errorMessage }) {
  const [values, setValues] = useState(emptyValues);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl bg-white/90 p-6 shadow-soft"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-strong)]">Manual input</p>
          <p className="text-xs text-[var(--muted)]">Isi sensor untuk simulasi prediksi.</p>
        </div>
        <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-semibold text-[var(--accent-strong)]">
          Manual mode
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          MQ-135
          <input
            name="mq135"
            value={values.mq135}
            onChange={handleChange}
            type="number"
            step="any"
            placeholder="360"
            className="rounded-2xl border border-transparent bg-[var(--surface)] px-4 py-3 text-sm font-normal text-[var(--text-strong)] shadow-inner"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          MQ-136
          <input
            name="mq136"
            value={values.mq136}
            onChange={handleChange}
            type="number"
            step="any"
            placeholder="260"
            className="rounded-2xl border border-transparent bg-[var(--surface)] px-4 py-3 text-sm font-normal text-[var(--text-strong)] shadow-inner"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Temperature
          <input
            name="temperature"
            value={values.temperature}
            onChange={handleChange}
            type="number"
            step="any"
            placeholder="24"
            className="rounded-2xl border border-transparent bg-[var(--surface)] px-4 py-3 text-sm font-normal text-[var(--text-strong)] shadow-inner"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Humidity
          <input
            name="humidity"
            value={values.humidity}
            onChange={handleChange}
            type="number"
            step="any"
            placeholder="55"
            className="rounded-2xl border border-transparent bg-[var(--surface)] px-4 py-3 text-sm font-normal text-[var(--text-strong)] shadow-inner"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          H2S
          <input
            name="h2s"
            value={values.h2s}
            onChange={handleChange}
            type="number"
            step="any"
            placeholder="0.02"
            className="rounded-2xl border border-transparent bg-[var(--surface)] px-4 py-3 text-sm font-normal text-[var(--text-strong)] shadow-inner"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          VOC
          <input
            name="voc"
            value={values.voc}
            onChange={handleChange}
            type="number"
            step="any"
            placeholder="0.12"
            className="rounded-2xl border border-transparent bg-[var(--surface)] px-4 py-3 text-sm font-normal text-[var(--text-strong)] shadow-inner"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Amonia
          <input
            name="amonia"
            value={values.amonia}
            onChange={handleChange}
            type="number"
            step="any"
            placeholder="0.08"
            className="rounded-2xl border border-transparent bg-[var(--surface)] px-4 py-3 text-sm font-normal text-[var(--text-strong)] shadow-inner"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:translate-y-[-1px] disabled:opacity-60"
        >
          {isLoading ? "Predicting..." : "Run prediction"}
        </button>
        {errorMessage ? (
          <p className="text-xs text-rose-500">{errorMessage}</p>
        ) : (
          <p className="text-xs text-[var(--muted)]">
            Input akan dikirim ke backend untuk inference.
          </p>
        )}
      </div>
    </form>
  );
}

PredictionForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  errorMessage: PropTypes.string
};

PredictionForm.defaultProps = {
  isLoading: false,
  errorMessage: ""
};

export default PredictionForm;
