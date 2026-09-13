import axios from "axios";

const API_URL =
  process.env.REACT_APP_API_URL ||
  "https://esp-32-project-pi.vercel.app";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const getLatestReading = async () => {
  const response = await api.get(
    "/api/sensors/latest"
  );

  return response.data;
};

export const getSensorReadings = async () => {
  const response = await api.get(
    "/api/sensors"
  );

  return response.data;
};

export const sendRecordingEvent = async (event, reading = null, readings = []) => {
  const isStart = event === "start";
  const response = await api.post("/api/sensors/recording", {
    event,
    status: isStart || event === "reading" ? "recording" : "stopped",
    source: "dashboard",
    recorded_at: new Date().toISOString(),
    distance_cm: reading ? Number(reading.distance_cm) : null,
    temperature_c: reading ? Number(reading.temperature_c) : null,
    sensor_recorded_at: reading?.recorded_at || null,
    readings: readings.map((item) => ({
      distance_cm: Number(item.distance_cm),
      temperature_c: Number(item.temperature_c),
      sensor_recorded_at: item.recorded_at,
    })),
  });

  return response.data;
};

export const getSensorReadingsLimit = async (
  limit = 50
) => {
  const response = await api.get(
    `/api/sensors/limit/${limit}`
  );

  return response.data;
};

export const checkHealth = async () => {
  const response = await api.get(
    "/health"
  );

  return response.data;
};

export const getCubes = async () => {
  const response = await api.get("/api/cubes");
  return response.data;
};

export const createCube = async (cube) => {
  const response = await api.post("/api/cubes", cube);
  return response.data;
};

export const getCube = async (qrToken) => {
  const response = await api.get(`/api/cubes/${qrToken}`);
  return response.data;
};

export const getCompressionTests = async (qrToken) => {
  const response = await api.get(`/api/cubes/${qrToken}/compression-tests`);
  return response.data;
};

export const uploadCompressionTest = async (qrToken, test) => {
  const formData = new FormData();
  formData.append("test_date", test.test_date);
  formData.append("maximum_load_kn", test.maximum_load_kn);
  formData.append("compressive_strength_mpa", test.compressive_strength_mpa);
  formData.append("confirmed_by", test.confirmed_by);
  formData.append("approval_confirmed", String(test.approval_confirmed));
  formData.append("cube_image", test.cube_image);

  const response = await api.post(
    `/api/cubes/${qrToken}/compression-tests`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
};

export default api;
