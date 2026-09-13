import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Box, CheckCircle2, Image as ImageIcon } from "lucide-react";

import PageHeader from "../components/PageHeader";
import { createCube, getCubes } from "../services/api";
import { getTestImageUrl, loadCompressionTests, nextCubeNumber } from "../utils/cubes";

function CubesPage() {
  const navigate = useNavigate();
  const [cubes, setCubes] = useState([]);
  const [cubeForm, setCubeForm] = useState({
    cube_number: "CUBE-001",
    concrete_grade: "",
    casting_date: "",
    test_age_days: 28,
  });
  const [loading, setLoading] = useState(false);
  const [cubesReady, setCubesReady] = useState(false);
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
      setCubeForm((current) => ({
        ...current,
        cube_number: nextCubeNumber(cubesWithImages),
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load concrete cubes.");
    } finally {
      setCubesReady(true);
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
      const response = await createCube({
        ...cubeForm,
        cube_number: cubeForm.cube_number || nextCubeNumber(cubes),
      });
      const created = response.data;
      const updatedCubes = created
        ? [{ ...created, latest_image: "", test_count: 0 }, ...cubes]
        : cubes;
      setCubes(updatedCubes);
      setCubeForm({
        cube_number: nextCubeNumber(updatedCubes),
        concrete_grade: "",
        casting_date: "",
        test_age_days: 28,
      });
      setMessage("Cube registered. Open it to print the QR label.");
      if (response.data?.qr_token) {
        navigate(`/cubes/${response.data.qr_token}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to register concrete cube.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-registry">
      <PageHeader
        eyebrow="Traceability"
        icon={Box}
        title="Cube Registry"
        description="Give each cube a permanent identity, then keep its test record in the catalog."
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
              disabled
              readOnly
              required
              value={cubeForm.cube_number}
            />
            <small className="field-hint">Assigned automatically</small>
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

          <button className="primary-button" disabled={loading || !cubesReady} type="submit">
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
            <p className="empty-cubes">No cubes in the catalog yet. Register the first one to begin.</p>
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
                    <span className={`status-pill ${cube.status}`}>{cube.status}</span>
                  </div>
                  <div className="cube-card-body">
                    <strong>{cube.cube_number}</strong>
                    <small>
                      {cube.concrete_grade} · {cube.test_age_days} days
                      {cube.test_count ? ` · ${cube.test_count} photo${cube.test_count === 1 ? "" : "s"}` : ""}
                    </small>
                  </div>
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
    </div>
  );
}

export default CubesPage;
