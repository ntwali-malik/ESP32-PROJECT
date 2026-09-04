import { useCallback, useEffect, useState } from "react";

import {
  checkHealth,
  getLatestReading,
  getSensorReadings,
} from "../services/api";

function useSensorData(intervalMs = 5000) {
  const [latest, setLatest] = useState(null);
  const [readings, setReadings] = useState([]);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastDashboardUpdate, setLastDashboardUpdate] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [latestResponse, readingsResponse, healthResponse] =
        await Promise.all([
          getLatestReading(),
          getSensorReadings(),
          checkHealth(),
        ]);

      setLatest(latestResponse.data);
      setReadings(readingsResponse.data || []);
      setOnline(healthResponse.success === true);
      setLastDashboardUpdate(new Date());
    } catch (err) {
      console.error("Dashboard error:", err);
      setOnline(false);

      if (err.response) {
        setError(err.response.data?.message || "The API returned an error.");
      } else if (err.request) {
        setError(
          "Cannot connect to the Node.js API. Make sure the backend is running."
        );
      } else {
        setError(err.message || "Unable to load sensor data.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    if (!intervalMs) {
      return undefined;
    }

    const interval = setInterval(loadDashboard, intervalMs);
    return () => clearInterval(interval);
  }, [loadDashboard, intervalMs]);

  return {
    latest,
    readings,
    online,
    loading,
    error,
    lastDashboardUpdate,
    reload: loadDashboard,
  };
}

export default useSensorData;
