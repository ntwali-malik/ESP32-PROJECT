import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Database, Play, Radio, RefreshCw, Square } from "lucide-react";

import AlertBanner from "../components/AlertBanner";
import PageHeader from "../components/PageHeader";
import SensorCard from "../components/SensorCard";
import SensorCharts from "../components/SensorCharts";
import SensorTable from "../components/SensorTable";
import StatusCard from "../components/StatusCard";
import { sendRecordingEvent } from "../services/api";
import useSensorData from "../hooks/useSensorData";

function numericDelta(current, previous) {
  if (current == null || previous == null) return null;
  return Number(current) - Number(previous);
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function DashboardPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingPermission, setRecordingPermission] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [recordingStartedAt, setRecordingStartedAt] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const lastSentSensorTimestamp = useRef(null);
  const {
    latest,
    readings,
    online,
    loading,
    error,
    lastDashboardUpdate,
    reload,
  } = useSensorData(5000, isRecording);

  useEffect(() => {
    if (!isRecording) return undefined;

    const timer = setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - recordingStartedAt) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [isRecording, recordingStartedAt]);

  useEffect(() => {
    if (!isRecording || !latest?.recorded_at) return undefined;
    if (latest.recorded_at === lastSentSensorTimestamp.current) return undefined;

    lastSentSensorTimestamp.current = latest.recorded_at;
    sendRecordingEvent("reading", latest).catch((err) => {
      setRecordingError(
        err.response?.data?.message || "Unable to save the latest ultrasonic reading."
      );
    });

    return undefined;
  }, [isRecording, latest]);

  const toggleRecording = async () => {
    if (recordingBusy || (!isRecording && !recordingPermission)) return;

    const event = isRecording ? "stop" : "start";

    try {
      setRecordingBusy(true);
      setRecordingError("");
      if (event === "start") {
        lastSentSensorTimestamp.current = latest?.recorded_at || null;
      }
      await sendRecordingEvent(event, latest);

      if (event === "start") {
        setRecordingStartedAt(Date.now());
        setRecordingSeconds(0);
        setIsRecording(true);
      } else {
        setIsRecording(false);
      }
    } catch (err) {
      setRecordingError(
        err.response?.data?.message || `Unable to ${event} distance capture. Try again.`
      );
    } finally {
      setRecordingBusy(false);
    }
  };

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

      {recordingError && (
        <AlertBanner title="Capture permission problem" type="error">
          {recordingError}
        </AlertBanner>
      )}

      <section className={`recording-panel ${isRecording ? "recording-active" : "recording-paused"}`}>
        <div className="recording-summary">
          <div className="recording-icon">
            <Radio size={20} />
          </div>
          <div>
            <div className="recording-title-row">
              <h2>Distance capture</h2>
              <span className="recording-status">
                <span className="recording-status-dot" />
                {isRecording ? "Recording" : "Paused"}
              </span>
            </div>
            <p>
              {isRecording
                ? "New ultrasonic distance readings are being captured from the live feed."
                : "Capture is stopped. Grant permission below before starting a new session."}
            </p>
            {!isRecording && (
              <label className="permission-check">
                <input
                  checked={recordingPermission}
                  onChange={(event) => setRecordingPermission(event.target.checked)}
                  type="checkbox"
                />
                <span>I have permission to record distance measurements</span>
              </label>
            )}
          </div>
        </div>
        <div className="recording-actions">
          <div className="recording-duration">
            <span>Session time</span>
            <strong>{formatDuration(recordingSeconds)}</strong>
          </div>
          <button
            aria-pressed={isRecording}
            disabled={recordingBusy || (!isRecording && !recordingPermission)}
            className={`recording-button ${isRecording ? "stop-button" : "start-button"}`}
            onClick={toggleRecording}
            type="button"
          >
            {isRecording ? <Square size={15} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            {recordingBusy ? "Saving..." : isRecording ? "Stop capture" : "Start capture"}
          </button>
        </div>
      </section>

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
