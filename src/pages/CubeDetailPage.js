import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Box,
  Camera,
  CheckCircle2,
  Image as ImageIcon,
  Printer,
  Upload,
  X,
} from "lucide-react";

import ImageCapture from "../components/ImageCapture";
import PageHeader from "../components/PageHeader";
import { getCube, uploadCompressionTest } from "../services/api";
import {
  formatMeasure,
  formatTestDate,
  getTestImageUrl,
  loadCompressionTests,
} from "../utils/cubes";

function CubeDetailPage() {
  const { qrToken } = useParams();
  const [cube, setCube] = useState(null);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [testForm, setTestForm] = useState({
    test_date: "",
    maximum_load_kn: "",
    compressive_strength_mpa: "",
    confirmed_by: "",
    approval_confirmed: false,
    cube_image: null,
  });

  const refreshEvidence = async () => {
    const [cubeResponse, loadedTests] = await Promise.all([
      getCube(qrToken),
      loadCompressionTests(qrToken).catch(() => []),
    ]);
    setCube(cubeResponse.data);
    setTests(loadedTests);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [cubeResponse, loadedTests] = await Promise.all([
          getCube(qrToken),
          loadCompressionTests(qrToken).catch(() => []),
        ]);
        if (cancelled) return;
        setCube(cubeResponse.data);
        setTests(loadedTests);
      } catch (err) {
        if (cancelled) return;
        setCube(null);
        setTests([]);
        setError(
          err.response?.data?.message ||
            "This QR code is not linked to a concrete cube."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [qrToken]);

  useEffect(() => {
    if (!lightbox) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightbox]);

  const handleTestSubmit = async (event) => {
    event.preventDefault();
    if (!cube) return;
    if (!testForm.cube_image) {
      setError("Add a cube image by scanning with the camera or uploading a file.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await uploadCompressionTest(cube.qr_token, testForm);
      setMessage("Compression result and cube image uploaded successfully.");
      setTestForm({
        test_date: "",
        maximum_load_kn: "",
        compressive_strength_mpa: "",
        confirmed_by: "",
        approval_confirmed: false,
        cube_image: null,
      });
      await refreshEvidence();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to upload compression test.");
    } finally {
      setSaving(false);
    }
  };

  const latestTest = tests[0];
  const latestImage = getTestImageUrl(latestTest);

  return (
    <>
      <Link className="back-link" to="/cubes">
        <ArrowLeft size={16} />
        Back to registry
      </Link>

      <PageHeader
        eyebrow="Cube identity"
        icon={Box}
        title={cube?.cube_number || "Cube details"}
        description="Review the cube identity, open its photos, and attach the next compression result."
      />

      {loading && <p className="empty-cubes">Loading cube and uploaded images...</p>}

      {error && (
        <div className="cube-notice error-alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {message && (
        <div className="cube-notice success-alert">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}

      {cube && (
        <>
          <div className="test-workspace">
            <section className="qr-panel">
              <div className="form-title">
                <Printer size={18} />
                <h3>{cube.cube_number} QR label</h3>
              </div>

              <div className="cube-meta">
                <span>{cube.concrete_grade}</span>
                <span>{cube.test_age_days} day test</span>
                <span className={`status-pill ${cube.status}`}>{cube.status}</span>
              </div>

              {cube.qr_code_data_url ? (
                <img
                  alt={`QR code for ${cube.cube_number}`}
                  className="qr-image"
                  src={cube.qr_code_data_url}
                />
              ) : (
                <p className="qr-missing">
                  QR artwork is available right after registration. Re-register or
                  scan the printed label to reopen this cube.
                </p>
              )}

              {cube.scan_url && <p className="scan-url">{cube.scan_url}</p>}

              {cube.qr_code_data_url && (
                <button className="secondary-button" onClick={() => window.print()} type="button">
                  <Printer size={16} />
                  Print label
                </button>
              )}
            </section>

            <section className="featured-evidence">
              <div className="form-title">
                <ImageIcon size={18} />
                <h3>Latest uploaded image</h3>
              </div>

              {latestImage ? (
                <button
                  className="featured-photo"
                  onClick={() => setLightbox(latestTest)}
                  type="button"
                >
                  <img alt={`${cube.cube_number} test result`} src={latestImage} />
                  <div className="featured-caption">
                    <strong>{formatTestDate(latestTest.test_date)}</strong>
                    <span>
                      {formatMeasure(latestTest.maximum_load_kn, "kN")} ·{" "}
                      {formatMeasure(latestTest.compressive_strength_mpa, "MPa")}
                    </span>
                  </div>
                </button>
              ) : (
                <div className="empty-evidence">
                  <ImageIcon size={28} />
                  <p>No cube photos uploaded yet. Scan or upload one below.</p>
                </div>
              )}
            </section>
          </div>

          <section className="evidence-section">
            <div className="section-heading">
              <div>
                <h2>Uploaded evidence</h2>
                <p>Compression photos and results attached to this cube.</p>
              </div>
              <span className="count-badge">{tests.length}</span>
            </div>

            {tests.length === 0 ? (
              <p className="empty-cubes">No test images have been saved for this cube.</p>
            ) : (
              <div className="evidence-grid">
                {tests.map((test) => {
                  const imageUrl = getTestImageUrl(test);
                  return (
                    <button
                      className="evidence-card"
                      key={test.id}
                      onClick={() => imageUrl && setLightbox(test)}
                      type="button"
                    >
                      {imageUrl ? (
                        <img alt={`Test on ${formatTestDate(test.test_date)}`} src={imageUrl} />
                      ) : (
                        <div className="evidence-fallback">
                          <ImageIcon size={22} />
                        </div>
                      )}
                      <div className="evidence-meta">
                        <strong>{formatTestDate(test.test_date)}</strong>
                        <small>
                          {formatMeasure(test.maximum_load_kn, "kN")}
                        </small>
                        <small>
                          {formatMeasure(test.compressive_strength_mpa, "MPa")}
                        </small>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {tests.length === 0 && (
          <form className="cube-form test-form evidence-upload" onSubmit={handleTestSubmit}>
            <div className="form-title">
              <Camera size={18} />
              <h3>Upload compression result</h3>
            </div>
            <p className="selected-label">
              Attached to <strong>{cube.cube_number}</strong>
            </p>

            <div className="form-row">
              <label>
                Test date
                <input
                  onChange={(event) =>
                    setTestForm({ ...testForm, test_date: event.target.value })
                  }
                  required
                  type="date"
                  value={testForm.test_date}
                />
              </label>
              <label>
                Maximum load (kN)
                <input
                  min="0"
                  onChange={(event) =>
                    setTestForm({
                      ...testForm,
                      maximum_load_kn: event.target.value,
                    })
                  }
                  required
                  step="0.001"
                  type="number"
                  value={testForm.maximum_load_kn}
                />
              </label>
            </div>

            <label>
              Compressive strength (MPa)
              <input
                min="0"
                onChange={(event) =>
                  setTestForm({
                    ...testForm,
                    compressive_strength_mpa: event.target.value,
                  })
                }
                required
                step="0.001"
                type="number"
                value={testForm.compressive_strength_mpa}
              />
            </label>

            <label>
              Confirmed by
              <input
                onChange={(event) =>
                  setTestForm({ ...testForm, confirmed_by: event.target.value })
                }
                placeholder="Enter your full name"
                required
                type="text"
                value={testForm.confirmed_by}
              />
            </label>

            <label className="approval-check">
              <input
                checked={testForm.approval_confirmed}
                onChange={(event) =>
                  setTestForm({
                    ...testForm,
                    approval_confirmed: event.target.checked,
                  })
                }
                required
                type="checkbox"
              />
              <span>I confirm that these compression results are correct.</span>
            </label>

            <ImageCapture
              file={testForm.cube_image}
              label="Compression result"
              onChange={(cube_image) => setTestForm({ ...testForm, cube_image })}
            />

            <button className="primary-button" disabled={saving} type="submit">
              <Upload size={16} />
              {saving ? "Uploading..." : "Save test result"}
            </button>
          </form>
          )}

          {tests.length > 0 && (
            <div className="cube-notice success-alert single-result-notice">
              <CheckCircle2 size={18} />
              This cube already has a compression result. Additional uploads are disabled.
            </div>
          )}
        </>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)} role="presentation">
          <div className="lightbox-panel" onClick={(event) => event.stopPropagation()}>
            <button className="preview-remove" onClick={() => setLightbox(null)} type="button">
              <X size={16} />
              Close
            </button>
            <img
              alt={`Result from ${formatTestDate(lightbox.test_date)}`}
              src={getTestImageUrl(lightbox)}
            />
            <div className="lightbox-caption">
              <strong>{formatTestDate(lightbox.test_date)}</strong>
              <span>
                {formatMeasure(lightbox.maximum_load_kn, "kN")} ·{" "}
                {formatMeasure(lightbox.compressive_strength_mpa, "MPa")}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CubeDetailPage;
