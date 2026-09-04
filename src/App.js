import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Database,
  Activity,
} from "lucide-react";

import Header from "./components/Header";
import SensorCard from "./components/SensorCard";
import StatusCard from "./components/StatusCard";
import SensorCharts from "./components/SensorCharts";
import SensorTable from "./components/SensorTable";

import {
  getLatestReading,
  getSensorReadings,
  checkHealth,
} from "./services/api";

function App() {

  const [latest, setLatest] =
    useState(null);

  const [readings, setReadings] =
    useState([]);

  const [online, setOnline] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [lastDashboardUpdate, setLastDashboardUpdate] =
    useState(null);

  const loadDashboard =
    useCallback(async () => {

      try {

        setLoading(true);
        setError("");

        const [
          latestResponse,
          readingsResponse,
          healthResponse,
        ] = await Promise.all([
          getLatestReading(),
          getSensorReadings(),
          checkHealth(),
        ]);

        setLatest(
          latestResponse.data
        );

        setReadings(
          readingsResponse.data || []
        );

        setOnline(
          healthResponse.success === true
        );

        setLastDashboardUpdate(
          new Date()
        );

      } catch (err) {

        console.error(
          "Dashboard error:",
          err
        );

        setOnline(false);

        if (
          err.response
        ) {

          setError(
            err.response.data?.message ||
            "The API returned an error."
          );

        } else if (
          err.request
        ) {

          setError(
            "Cannot connect to the Node.js API. Make sure the backend is running."
          );

        } else {

          setError(
            err.message ||
            "Unable to load sensor data."
          );
        }

      } finally {

        setLoading(false);

      }

    }, []);

  useEffect(() => {

    loadDashboard();

    const interval =
      setInterval(
        loadDashboard,
        5000
      );

    return () => {
      clearInterval(interval);
    };

  }, [loadDashboard]);

  const formatDashboardTime =
    () => {

      if (
        !lastDashboardUpdate
      ) {
        return "Waiting...";
      }

      return lastDashboardUpdate.toLocaleTimeString();
    };

  const formatReadingTime =
    () => {

      if (!latest) {
        return "No reading";
      }

      return new Date(
        latest.recorded_at
      ).toLocaleString();
    };

  return (
    <div className="app">

      <Header
        onRefresh={loadDashboard}
        loading={loading}
      />

      <main className="main-container">

        {/* Page heading */}

        <section className="page-heading">

          <div>

            <div className="heading-label">

              <Activity size={16} />

              <span>
                LIVE MONITORING
              </span>

            </div>

            <h2>
              Sensor Overview
            </h2>

            <p>
              Monitor your ESP32 temperature
              and distance sensors in real time.
            </p>

          </div>

          <div className="database-indicator">

            <Database size={18} />

            <span>
              Neon PostgreSQL
            </span>

            <span
              className={`mini-status ${
                online
                  ? "online"
                  : "offline"
              }`}
            />

          </div>

        </section>

        {/* Error */}

        {error && (

          <div className="alert error-alert">

            <AlertCircle size={21} />

            <div>

              <strong>
                Connection Problem
              </strong>

              <p>
                {error}
              </p>

            </div>

          </div>

        )}

        {/* Success */}

        {!error && online && (

          <div className="alert success-alert">

            <CheckCircle2 size={19} />

            <span>
              Connected to the ESP32 sensor API
            </span>

          </div>

        )}

        {/* Sensor cards */}

        <section className="cards-grid">

          <SensorCard
            type="temperature"
            value={
              latest
                ? Number(
                    latest.temperature_c
                  ).toFixed(2)
                : "--"
            }
            unit="°C"
            updated={
              latest
                ? formatDashboardTime()
                : "Waiting..."
            }
          />

          <SensorCard
            type="distance"
            value={
              latest
                ? Number(
                    latest.distance_cm
                  ).toFixed(2)
                : "--"
            }
            unit="cm"
            updated={
              latest
                ? formatDashboardTime()
                : "Waiting..."
            }
          />

          <StatusCard
            online={online}
            lastUpdate={
              formatReadingTime()
            }
          />

        </section>

        {/* Charts */}

        <section className="section">

          <div className="section-heading">

            <div>

              <h2>
                Sensor Analytics
              </h2>

              <p>
                Visual representation of your
                sensor measurements.
              </p>

            </div>

          </div>

          <SensorCharts
            readings={readings.slice(
              0,
              50
            )}
          />

        </section>

        {/* Table */}

        <section className="section">

          <SensorTable
            readings={readings.slice(
              0,
              20
            )}
          />

        </section>

        {/* Footer */}

        <footer className="footer">

          <div>
            ESP32 Sensor Monitoring System
          </div>

          <div>
            Auto-refresh: 5 seconds
          </div>

        </footer>

      </main>

    </div>
  );
}

export default App;