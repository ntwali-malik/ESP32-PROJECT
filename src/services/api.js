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

export const uploadCompressionTest = async (qrToken, test) => {
  const formData = new FormData();
  formData.append("test_date", test.test_date);
  formData.append("maximum_load_kn", test.maximum_load_kn);
  formData.append("compressive_strength_mpa", test.compressive_strength_mpa);
  formData.append("cube_image", test.cube_image);

  const response = await api.post(
    `/api/cubes/${qrToken}/compression-tests`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
};

export default api;
