import {
  Activity,
  RefreshCw,
} from "lucide-react";

function Header({
  onRefresh,
  loading,
}) {
  return (
    <header className="header">
      <div className="header-container">

        <div className="brand">

          <div className="brand-icon">
            <Activity size={24} />
          </div>

          <div>
            <h1>
              ESP32 Monitor
            </h1>

            <p>
              IoT Sensor Dashboard
            </p>
          </div>

        </div>

        <button
          className="refresh-button"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={
              loading
                ? "spin"
                : ""
            }
          />

          <span>
            Refresh
          </span>
        </button>

      </div>
    </header>
  );
}

export default Header;