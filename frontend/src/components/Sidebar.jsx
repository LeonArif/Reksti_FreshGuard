import PropTypes from "prop-types";
import { Link } from "react-router-dom";

const navItems = [
  { label: "Predict", value: "predict", to: "/predict" },
  { label: "Dashboard", value: "dashboard", to: "/dashboard" },
  { label: "History", value: "history", to: "/history" }
];

function Sidebar({ active }) {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:gap-8 lg:py-10">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent)] text-white shadow-glow">
          <span className="text-lg font-semibold">FG</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-strong)]">Fresh Guard</p>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">IoT Monitor</p>
        </div>
      </div>

      <nav className="flex flex-col gap-3">
        {navItems.map((item) => (
          <Link
            key={item.value}
            to={item.to}
            className={`rounded-full px-5 py-3 text-left text-sm font-semibold transition ${
              active === item.value
                ? "bg-[var(--accent)] text-white shadow-glow"
                : "bg-white/80 text-[var(--text-strong)] hover:bg-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl bg-white/70 p-4 text-xs text-[var(--muted)] shadow-soft">
        <p>Prediction history is isolated per user account.</p>
      </div>
    </aside>
  );
}

Sidebar.propTypes = {
  active: PropTypes.string
};

Sidebar.defaultProps = {
  active: "predict"
};

export default Sidebar;
