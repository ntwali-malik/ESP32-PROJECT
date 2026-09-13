import { LineChart, RefreshCw } from "lucide-react";

import AlertBanner from "../components/AlertBanner";
import PageHeader from "../components/PageHeader";
import SensorCharts from "../components/SensorCharts";
import useSensorData from "../hooks/useSensorData";

function summarize(readings, key) {
  if (!readings.length) {
    return { min: "--", max: "--", avg: "--" };
  }

  const values = readings.map((reading) => Number(reading[key]));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((total, value) => total + value, 0) / values.length;

  return {
    min: min.toFixed(2),
    max: max.toFixed(2),
    avg: avg.toFixed(2),
  };
}

function AnalyticsPage() {
  const { readings, loading, error, reload } = useSensorData();
  const temperature = summarize(readings, "temperature_c");
  const distance = summarize(readings, "distance_cm");

  return (
    <div className="page-analytics">
      <PageHeader
        eyebrow="Trends"
        icon={LineChart}
        title="Analytics"
        description="See how the batch is moving: range, average, and the latest temperature curve."
        actions={
          <button className="refresh-button" disabled={loading} onClick={reload} type="button">
            <RefreshCw className={loading ? "spin" : ""} size={16} />
            Refresh
          </button>
        }
      />

      {error && (
        <AlertBanner title="Connection problem" type="error">
          {error}
        </AlertBanner>
      )}

      <div className="metric-board">
        <section className="metric-group">
          <div className="metric-group-title">
            <span>Temperature</span>
            <small>{readings.length} samples · °C</small>
          </div>
          <div className="stats-grid">
            <article className="stat-card stat-temp">
              <p>Minimum</p>
              <strong>{temperature.min}<span>°C</span></strong>
            </article>
            <article className="stat-card stat-temp">
              <p>Average</p>
              <strong>{temperature.avg}<span>°C</span></strong>
            </article>
            <article className="stat-card stat-temp">
              <p>Maximum</p>
              <strong>{temperature.max}<span>°C</span></strong>
            </article>
          </div>
        </section>

        <section className="metric-group">
          <div className="metric-group-title">
            <span>Distance</span>
            <small>{readings.length} samples · cm</small>
          </div>
          <div className="stats-grid">
            <article className="stat-card stat-dist">
              <p>Minimum</p>
              <strong>{distance.min}<span>cm</span></strong>
            </article>
            <article className="stat-card stat-dist">
              <p>Average</p>
              <strong>{distance.avg}<span>cm</span></strong>
            </article>
            <article className="stat-card stat-dist">
              <p>Maximum</p>
              <strong>{distance.max}<span>cm</span></strong>
            </article>
          </div>
        </section>
      </div>

      <section className="section">
        <div className="section-heading">
          <div>
            <h2>Temperature curve</h2>
            <p>Latest fifty samples from the sensor log.</p>
          </div>
        </div>
        <SensorCharts
          height={360}
          readings={readings.slice(0, 50)}
          showDistance={false}
        />
      </section>
    </div>
  );
}

export default AnalyticsPage;
