import PropTypes from "prop-types";

function MetricCard({ title, value, unit, tone, subtitle }) {
  return (
    <div className={`rounded-3xl p-6 shadow-soft ${tone}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{title}</p>
      <div className="mt-4 flex items-end gap-2">
        <span className="text-4xl font-semibold text-[var(--text-strong)]">{value}</span>
        {unit ? <span className="text-sm text-[var(--muted)]">{unit}</span> : null}
      </div>
      {subtitle ? <p className="mt-3 text-sm text-[var(--muted)]">{subtitle}</p> : null}
    </div>
  );
}

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  unit: PropTypes.string,
  tone: PropTypes.string,
  subtitle: PropTypes.string
};

MetricCard.defaultProps = {
  unit: "",
  tone: "bg-white/80",
  subtitle: ""
};

export default MetricCard;
