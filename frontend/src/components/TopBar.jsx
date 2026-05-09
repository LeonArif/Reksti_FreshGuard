import PropTypes from "prop-types";

function TopBar({ statusLabel, lastUpdatedLabel, userEmail, onSignOut }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white/80 px-6 py-4 shadow-soft">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-3 w-3 rounded-full bg-emerald-500" />
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Device status</p>
          <p className="text-sm font-semibold text-[var(--text-strong)]">{statusLabel}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-full bg-[var(--accent-soft)] px-4 py-2 text-xs font-semibold text-[var(--accent-strong)]">
          Last updated: {lastUpdatedLabel}
        </div>
        <div className="hidden sm:block text-xs text-[var(--muted)]">{userEmail}</div>
        <button
          type="button"
          className="rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-glow transition hover:translate-y-[-1px]"
          onClick={onSignOut}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

TopBar.propTypes = {
  statusLabel: PropTypes.string.isRequired,
  lastUpdatedLabel: PropTypes.string,
  userEmail: PropTypes.string,
  onSignOut: PropTypes.func.isRequired
};

TopBar.defaultProps = {
  lastUpdatedLabel: "never",
  userEmail: ""
};

export default TopBar;
