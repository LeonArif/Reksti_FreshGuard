import PropTypes from "prop-types";

const navItems = [
  { label: "Dashboard", value: "dashboard" },
  { label: "Sensors", value: "sensors" },
  { label: "Device Logs", value: "logs" },
  { label: "Settings", value: "settings" }
];

function Sidebar({ active, isOnline, lastUpdatedLabel }) {
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
          <button
            key={item.value}
            type="button"
            className={`rounded-full px-5 py-3 text-left text-sm font-semibold transition ${
              active === item.value
                ? "bg-[var(--accent)] text-white shadow-glow"
                : "bg-white/80 text-[var(--text-strong)] hover:bg-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl bg-white/70 p-4 text-xs text-[var(--muted)] shadow-soft">
        <div className="mb-2 flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-rose-400"}`} />
          {isOnline ? "ESP32 Online" : "ESP32 Offline"}
        </div>
        <p>Last update: {lastUpdatedLabel}</p>
      </div>
    </aside>
  );
}

Sidebar.propTypes = {
  active: PropTypes.string,
  isOnline: PropTypes.bool,
  lastUpdatedLabel: PropTypes.string
};

Sidebar.defaultProps = {
  active: "dashboard",
  isOnline: false,
  lastUpdatedLabel: "never"
};

export default Sidebar;
