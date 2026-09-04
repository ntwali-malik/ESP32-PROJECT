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
    <>
      <PageHeader
        eyebrow="Trends"
        icon={LineChart}
        title="Sensor analytics"
        description="Min, max, and average values across the stored samples, with full history charts."
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

      <section className="stats-grid">
        <article className="stat-card">
          <p>Temperature min</p>
          <strong>{temperature.min}<span>°C</span></strong>
        </article>
        <article className="stat-card">
          <p>Temperature avg</p>
          <strong>{temperature.avg}<span>°C</span></strong>
        </article>
        <article className="stat-card">
          <p>Temperature max</p>
          <strong>{temperature.max}<span>°C</span></strong>
        </article>
        <article className="stat-card">
          <p>Distance min</p>
          <strong>{distance.min}<span>cm</span></strong>
        </article>
        <article className="stat-card">
          <p>Distance avg</p>
          <strong>{distance.avg}<span>cm</span></strong>
        </article>
        <article className="stat-card">
          <p>Distance max</p>
          <strong>{distance.max}<span>cm</span></strong>
        </article>
      </section>

      <section className="section">
        <SensorCharts height={320} readings={readings.slice(0, 50)} />
      </section>
    </>
  );
}

export default AnalyticsPage;
