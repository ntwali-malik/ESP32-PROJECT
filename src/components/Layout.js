import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Box,
  Clock,
  LayoutDashboard,
  LineChart,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/analytics", label: "Analytics", icon: LineChart },
  { to: "/history", label: "Readings", icon: Clock },
  { to: "/cubes", label: "Cube Registry", icon: Box },
];

function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">QC</div>
          <div>
            <h1>Concrete QC</h1>
            <p>Quality control studio</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
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
