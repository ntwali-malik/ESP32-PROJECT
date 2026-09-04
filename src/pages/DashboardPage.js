import { Link } from "react-router-dom";
import { Activity, Database, RefreshCw } from "lucide-react";

import AlertBanner from "../components/AlertBanner";
import PageHeader from "../components/PageHeader";
import SensorCard from "../components/SensorCard";
import SensorCharts from "../components/SensorCharts";
import SensorTable from "../components/SensorTable";
import StatusCard from "../components/StatusCard";
import useSensorData from "../hooks/useSensorData";

function numericDelta(current, previous) {
  if (current == null || previous == null) return null;
  return Number(current) - Number(previous);
}

function DashboardPage() {
  const {
    latest,
    readings,
    online,
    loading,
    error,
    lastDashboardUpdate,
    reload,
  } = useSensorData();

  const previous = readings[1];
  const temperatureDelta = latest && previous
    ? numericDelta(latest.temperature_c, previous.temperature_c)
    : null;
  const distanceDelta = latest && previous
    ? numericDelta(latest.distance_cm, previous.distance_cm)
    : null;

  const lastDashboardTime = lastDashboardUpdate
    ? lastDashboardUpdate.toLocaleTimeString()
    : "Waiting...";

  const lastReadingTime = latest
    ? new Date(latest.recorded_at).toLocaleString()
    : "No reading";

  return (
    <>
      <PageHeader
        eyebrow="Live monitoring"
        icon={Activity}
        title="Sensor overview"
        description="Live temperature and distance from the ESP32, with a snapshot of recent samples."
        actions={
          <>
            <div className="database-indicator">
              <Database size={16} />
              <span>Neon PostgreSQL</span>
              <span className={`mini-status ${online ? "online" : "offline"}`} />
            </div>
            <button className="refresh-button" disabled={loading} onClick={reload} type="button">
              <RefreshCw className={loading ? "spin" : ""} size={16} />
              Refresh
            </button>
          </>
        }
      />

      {error && (
        <AlertBanner title="Connection problem" type="error">
          {error}
        </AlertBanner>
      )}

      {!error && online && (
        <AlertBanner type="success">Connected to the ESP32 sensor API</AlertBanner>
      )}

      <section className="cards-grid">
        <SensorCard
          type="temperature"
          value={latest ? Number(latest.temperature_c).toFixed(2) : "--"}
          unit="°C"
          updated={latest ? lastDashboardTime : "Waiting..."}
          delta={temperatureDelta}
        />
        <SensorCard
          type="distance"
          value={latest ? Number(latest.distance_cm).toFixed(2) : "--"}
          unit="cm"
          updated={latest ? lastDashboardTime : "Waiting..."}
          delta={distanceDelta}
        />
        <StatusCard online={online} lastUpdate={lastReadingTime} />
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Recent trend</h2>
            <p>Last 20 samples from the live feed.</p>
          </div>
          <Link className="text-link" to="/analytics">
            Open analytics
          </Link>
        </div>
        <SensorCharts height={240} readings={readings.slice(0, 20)} />
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Latest readings</h2>
            <p>Newest records from the sensor log.</p>
          </div>
          <Link className="text-link" to="/history">
            View all readings
          </Link>
        </div>
        <SensorTable
          description="Most recent eight samples"
          readings={readings.slice(0, 8)}
          title="Recent history"
        />
      </section>
    </>
  );
}

export default DashboardPage;
