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
  Box,
  Camera,
  Printer,
  Upload,
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
  getCubes,
  getCube,
  createCube,
  uploadCompressionTest,
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

  const [cubes, setCubes] = useState([]);
  const [selectedCube, setSelectedCube] = useState(null);
  const [cubeForm, setCubeForm] = useState({
    cube_number: "",
    concrete_grade: "",
    casting_date: "",
    test_age_days: 28,
  });
  const [testForm, setTestForm] = useState({
    test_date: "",
    maximum_load_kn: "",
    compressive_strength_mpa: "",
    cube_image: null,
  });
  const [cubeLoading, setCubeLoading] = useState(false);
  const [cubeMessage, setCubeMessage] = useState("");
  const [cubeError, setCubeError] = useState("");

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

  const loadCubes = async () => {
    try {
      const response = await getCubes();
      setCubes(response.data || []);
    } catch (err) {
      setCubeError(err.response?.data?.message || "Unable to load concrete cubes.");
    }
  };

  useEffect(() => {
    loadCubes();
  }, []);

  useEffect(() => {
    const pathParts = window.location.pathname.split("/").filter(Boolean);
    if (pathParts[0] !== "cubes" || !pathParts[1]) return;

    getCube(pathParts[1])
      .then((response) => setSelectedCube(response.data))
      .catch((err) => setCubeError(err.response?.data?.message || "This QR code is not linked to a concrete cube."));
  }, []);

  const handleCubeSubmit = async (event) => {
    event.preventDefault();
    setCubeLoading(true);
    setCubeError("");
    setCubeMessage("");

    try {
      const response = await createCube(cubeForm);
      setSelectedCube(response.data);
      setCubes((current) => [response.data, ...current]);
      setCubeForm({ cube_number: "", concrete_grade: "", casting_date: "", test_age_days: 28 });
      setCubeMessage("Cube registered. Print this QR code and attach it to the cube.");
    } catch (err) {
      setCubeError(err.response?.data?.message || "Unable to register concrete cube.");
    } finally {
      setCubeLoading(false);
    }
  };

  const handleTestSubmit = async (event) => {
    event.preventDefault();
    if (!selectedCube) return;

    setCubeLoading(true);
    setCubeError("");
    setCubeMessage("");
    try {
      await uploadCompressionTest(selectedCube.qr_token, testForm);
      setCubeMessage("Compression result and cube image uploaded successfully.");
      setTestForm({ test_date: "", maximum_load_kn: "", compressive_strength_mpa: "", cube_image: null });
      await loadCubes();
    } catch (err) {
      setCubeError(err.response?.data?.message || "Unable to upload compression test.");
    } finally {
      setCubeLoading(false);
    }
  };

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

        <section className="section cube-section">
          <div className="section-heading">
            <div>
              <div className="heading-label"><Box size={16} /><span>CUBE TRACEABILITY</span></div>
              <h2>Concrete Cube Registry</h2>
              <p>Generate a permanent QR identity, print it, and attach test evidence to the scanned cube.</p>
            </div>
          </div>

          <div className="cube-workspace">
            <form className="cube-form" onSubmit={handleCubeSubmit}>
              <div className="form-title"><Box size={19} /><h3>Register a cube</h3></div>
              <label>Cube number<input required value={cubeForm.cube_number} onChange={(event) => setCubeForm({ ...cubeForm, cube_number: event.target.value })} placeholder="CUBE-001" /></label>
              <label>Concrete grade<input required value={cubeForm.concrete_grade} onChange={(event) => setCubeForm({ ...cubeForm, concrete_grade: event.target.value })} placeholder="M25" /></label>
              <div className="form-row">
                <label>Casting date<input required type="date" value={cubeForm.casting_date} onChange={(event) => setCubeForm({ ...cubeForm, casting_date: event.target.value })} /></label>
                <label>Test age (days)<input required min="1" type="number" value={cubeForm.test_age_days} onChange={(event) => setCubeForm({ ...cubeForm, test_age_days: event.target.value })} /></label>
              </div>
              <button className="primary-button" disabled={cubeLoading} type="submit"><Box size={17} />{cubeLoading ? "Registering..." : "Generate QR code"}</button>
            </form>

            <div className="cube-list">
              <div className="form-title"><Activity size={19} /><h3>Registered cubes</h3><span className="count-badge">{cubes.length}</span></div>
              {cubes.length === 0 ? <p className="empty-cubes">No cubes registered yet.</p> : cubes.map((cube) => (
                <button className={`cube-row ${selectedCube?.qr_token === cube.qr_token ? "selected" : ""}`} key={cube.id} onClick={() => setSelectedCube(cube)} type="button">
                  <span><strong>{cube.cube_number}</strong><small>{cube.concrete_grade} · {cube.test_age_days} days</small></span>
                  <span className={`status-pill ${cube.status}`}>{cube.status}</span>
                </button>
              ))}
            </div>
          </div>

          {cubeMessage && <div className="cube-notice success-alert"><CheckCircle2 size={18} />{cubeMessage}</div>}
          {cubeError && <div className="cube-notice error-alert"><AlertCircle size={18} />{cubeError}</div>}

          {selectedCube && <div className="test-workspace">
            <div className="qr-panel">
              <div className="form-title"><Printer size={19} /><h3>{selectedCube.cube_number} QR label</h3></div>
              {selectedCube.qr_code_data_url ? <img className="qr-image" src={selectedCube.qr_code_data_url} alt={`QR code for ${selectedCube.cube_number}`} /> : <p className="qr-missing">Select the newly generated cube to print its QR code.</p>}
              {selectedCube.scan_url && <p className="scan-url">{selectedCube.scan_url}</p>}
              {selectedCube.qr_code_data_url && <button className="secondary-button" type="button" onClick={() => window.print()}><Printer size={16} />Print label</button>}
            </div>
            <form className="cube-form test-form" onSubmit={handleTestSubmit}>
              <div className="form-title"><Camera size={19} /><h3>Upload compression result</h3></div>
              <p className="selected-label">Attached to <strong>{selectedCube.cube_number}</strong></p>
              <div className="form-row">
                <label>Test date<input required type="date" value={testForm.test_date} onChange={(event) => setTestForm({ ...testForm, test_date: event.target.value })} /></label>
                <label>Maximum load (kN)<input required min="0" step="0.001" type="number" value={testForm.maximum_load_kn} onChange={(event) => setTestForm({ ...testForm, maximum_load_kn: event.target.value })} /></label>
              </div>
              <label>Compressive strength (MPa)<input required min="0" step="0.001" type="number" value={testForm.compressive_strength_mpa} onChange={(event) => setTestForm({ ...testForm, compressive_strength_mpa: event.target.value })} /></label>
              <label className="file-input">Cube image<input required accept="image/*" type="file" onChange={(event) => setTestForm({ ...testForm, cube_image: event.target.files[0] })} /><span><Upload size={16} />{testForm.cube_image?.name || "Choose an image"}</span></label>
              <button className="primary-button" disabled={cubeLoading} type="submit"><Upload size={17} />{cubeLoading ? "Uploading..." : "Save test result"}</button>
            </form>
          </div>}
        </section>

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