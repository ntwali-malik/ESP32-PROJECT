import axios from "axios";

const API_URL =
  process.env.REACT_APP_API_URL ||
  "http://localhost:3000";

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

export default api;
