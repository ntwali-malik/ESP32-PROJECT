import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import AnalyticsPage from "./pages/AnalyticsPage";
import CubeDetailPage from "./pages/CubeDetailPage";
import CubesPage from "./pages/CubesPage";
import DashboardPage from "./pages/DashboardPage";
import HistoryPage from "./pages/HistoryPage";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/cubes" element={<CubesPage />} />
        <Route path="/cubes/:qrToken" element={<CubeDetailPage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  );
}

export default App;
