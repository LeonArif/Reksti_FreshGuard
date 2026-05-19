import PropTypes from "prop-types";
import Sidebar from "./Sidebar.jsx";
import TopBar from "./TopBar.jsx";

function PageShell({ active, statusLabel, lastUpdatedLabel, userEmail, onSignOut, children }) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[240px,1fr]">
        <Sidebar active={active} />

        <div className="flex flex-col gap-6">
          <TopBar
            statusLabel={statusLabel}
            lastUpdatedLabel={lastUpdatedLabel}
            userEmail={userEmail}
            onSignOut={onSignOut}
          />
          {children}
        </div>
      </div>
    </div>
  );
}

PageShell.propTypes = {
  active: PropTypes.string,
  statusLabel: PropTypes.string.isRequired,
  lastUpdatedLabel: PropTypes.string,
  userEmail: PropTypes.string,
  onSignOut: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired
};

PageShell.defaultProps = {
  active: "predict",
  lastUpdatedLabel: "never",
  userEmail: ""
};

export default PageShell;
