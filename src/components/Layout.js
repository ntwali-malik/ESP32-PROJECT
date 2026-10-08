import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Beaker, Box, Menu, X } from "lucide-react";

import { useActiveBatch } from "../context/ActiveBatchContext";
import { checkHealth } from "../services/api";
import { SLUMP_STATUS_LABELS } from "../utils/mix";

const navItems = [
  { to: "/batches", label: "Batches", icon: Beaker },
  { to: "/cubes", label: "Cube Registry", icon: Box },
];

const HEALTH_POLL_MS = 30000;

function useApiOnline() {
  const [online, setOnline] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const check = () => Promise.resolve()
      .then(() => checkHealth())
      .then((response) => { if (!cancelled) setOnline(response?.success === true); })
      .catch(() => { if (!cancelled) setOnline(false); });
    check();
    const timer = window.setInterval(check, HEALTH_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);
  return online;
}

function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { batchId, batch, clearBatch } = useActiveBatch();
  const { pathname } = useLocation();
  const online = useApiOnline();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <Link className="brand" to="/batches">
          <div className="brand-mark">QC</div>
          <div>
            <h1>Concrete QC</h1>
            <p>Quality control studio</p>
          </div>
        </Link>

        <nav aria-label="Main" className="sidebar-nav">
          <div className="nav-section">
            <p className="nav-section-label">Workspace</p>
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>

          {batchId && (
            <div className="nav-section">
              <p className="nav-section-label">Current batch</p>
              <div className="active-batch-card">
                <Link className="active-batch-name" to={`/batches/${batchId}`}>{batch?.batch_number || "Loading batch..."}</Link>
                {batch && (
                  <small>
                    {batch.concrete_grade} · <span className={`slump-dot ${batch.slump_status}`} />{SLUMP_STATUS_LABELS[batch.slump_status] || batch.slump_status}
                  </small>
                )}
                <div className="active-batch-links">
                  <Link to={`/batches/${batchId}/curing`}>Curing & sensors</Link>
                  <button className="active-batch-close" onClick={clearBatch} type="button">Close</button>
                </div>
              </div>
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <span className={`footer-live ${online === false ? "offline" : ""}`}>
            <span className={online ? "live-pulse" : "status-dot offline"} />
            {online === null ? "Checking sensor API..." : online ? "Sensor API online" : "Sensor API offline"}
          </span>
        </div>
      </aside>

      {menuOpen && (
        <button
          aria-label="Close menu"
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      )}

      <div className="shell-main">
        <header className="topbar">
          <button
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="topbar-brand">
            <span className="brand-mark compact">QC</span>
            <span>Concrete QC</span>
          </div>
        </header>

        <main className="main-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
