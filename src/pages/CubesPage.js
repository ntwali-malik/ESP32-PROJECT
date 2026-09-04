import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Box, CheckCircle2, Image as ImageIcon } from "lucide-react";

import ImageCapture from "../components/ImageCapture";
import PageHeader from "../components/PageHeader";
import { createCube, getCubes } from "../services/api";
import { getTestImageUrl, loadCompressionTests } from "../utils/cubes";

function CubesPage() {
  const navigate = useNavigate();
  const [cubes, setCubes] = useState([]);
  const [cubeForm, setCubeForm] = useState({
    cube_number: "",
    concrete_grade: "",
    casting_date: "",
    test_age_days: 28,
    cube_image: null,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadCubes = async () => {
    try {
      const response = await getCubes();
      const cubesData = response.data || [];
      const cubesWithImages = await Promise.all(
        cubesData.map(async (cube) => {
          try {
            const tests = await loadCompressionTests(cube.qr_token);
            return {
              ...cube,
              latest_image: getTestImageUrl(tests[0]),
              test_count: tests.length,
            };
          } catch (err) {
            return { ...cube, latest_image: "", test_count: 0 };
          }
        })
      );
      setCubes(cubesWithImages);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load concrete cubes.");
    }
  };

  useEffect(() => {
    loadCubes();
  }, []);

  const handleCubeSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await createCube(cubeForm);
      setCubes((current) => [response.data, ...current]);
      const capturedImage = cubeForm.cube_image;
      setCubeForm({
        cube_number: "",
        concrete_grade: "",
        casting_date: "",
        test_age_days: 28,
        cube_image: null,
      });
      setMessage("Cube registered. Open it to print the QR label.");
      if (response.data?.qr_token) {
        navigate(`/cubes/${response.data.qr_token}`, {
          state: { cubeImage: capturedImage || null },
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to register concrete cube.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Traceability"
        icon={Box}
        title="Concrete cube registry"
        description="Register a cube, generate a permanent QR identity, then attach compression evidence after testing."
      />

      <div className="cube-workspace">
        <form className="cube-form" onSubmit={handleCubeSubmit}>
          <div className="form-title">
            <Box size={18} />
            <h3>Register a cube</h3>
          </div>

          <label>
            Cube number
            <input
              onChange={(event) =>
                setCubeForm({ ...cubeForm, cube_number: event.target.value })
              }
              placeholder="CUBE-001"
              required
              value={cubeForm.cube_number}
            />
          </label>

          <label>
            Concrete grade
            <input
              onChange={(event) =>
                setCubeForm({ ...cubeForm, concrete_grade: event.target.value })
              }
              placeholder="M25"
              required
              value={cubeForm.concrete_grade}
            />
          </label>

          <div className="form-row">
            <label>
              Casting date
              <input
                onChange={(event) =>
                  setCubeForm({ ...cubeForm, casting_date: event.target.value })
                }
                required
                type="date"
                value={cubeForm.casting_date}
              />
            </label>
            <label>
              Test age (days)
              <input
                min="1"
                onChange={(event) =>
                  setCubeForm({ ...cubeForm, test_age_days: event.target.value })
                }
                required
                type="number"
                value={cubeForm.test_age_days}
              />
            </label>
          </div>

          <ImageCapture
            file={cubeForm.cube_image}
            label="Cube photo"
            onChange={(cube_image) => setCubeForm({ ...cubeForm, cube_image })}
          />

          <button className="primary-button" disabled={loading} type="submit">
            <Box size={16} />
            {loading ? "Registering..." : "Generate QR code"}
          </button>
        </form>

        <section className="cube-list">
          <div className="form-title">
            <Box size={18} />
            <h3>Registered cubes</h3>
            <span className="count-badge">{cubes.length}</span>
          </div>

          {cubes.length === 0 ? (
            <p className="empty-cubes">No cubes registered yet.</p>
          ) : (
            <div className="cube-grid">
              {cubes.map((cube) => (
                <button
                  className="cube-card"
                  key={cube.id}
                  onClick={() => navigate(`/cubes/${cube.qr_token}`)}
                  type="button"
                >
                  <div className="cube-card-photo">
                    {cube.latest_image ? (
                      <img alt={`${cube.cube_number}`} src={cube.latest_image} />
                    ) : (
                      <span className="cube-card-placeholder">
                        <ImageIcon size={22} />
                      </span>
                    )}
                  </div>
                  <span className={`status-pill ${cube.status}`}>{cube.status}</span>
                  <strong>{cube.cube_number}</strong>
                  <small>
                    {cube.concrete_grade} · {cube.test_age_days} days
                    {cube.test_count ? ` · ${cube.test_count} photo${cube.test_count === 1 ? "" : "s"}` : ""}
                  </small>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {message && (
        <div className="cube-notice success-alert">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}
      {error && (
        <div className="cube-notice error-alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
    </>
  );
}

export default CubesPage;
