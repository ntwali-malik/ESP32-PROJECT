import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import { ActiveBatchProvider } from "./context/ActiveBatchContext";
import BatchWorkspace from "./pages/batch/BatchWorkspace";
import CuringTab from "./pages/batch/CuringTab";
import ReportTab from "./pages/batch/ReportTab";
import SlumpTab from "./pages/batch/SlumpTab";
import SpecimensTab from "./pages/batch/SpecimensTab";
import SummaryTab from "./pages/batch/SummaryTab";
import BatchesPage from "./pages/BatchesPage";
import CubeDetailPage from "./pages/CubeDetailPage";
import CubesPage from "./pages/CubesPage";
import NewBatchPage from "./pages/NewBatchPage";

function App() {
  return (
    <ActiveBatchProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate replace to="/batches" />} />
          <Route path="/batches" element={<BatchesPage />} />
          <Route path="/batches/new" element={<NewBatchPage />} />
          <Route path="/batches/:batchId" element={<BatchWorkspace />}>
            <Route index element={<SummaryTab />} />
            <Route path="slump" element={<SlumpTab />} />
            <Route path="curing" element={<CuringTab />} />
            <Route path="specimens" element={<SpecimensTab />} />
            <Route path="report" element={<ReportTab />} />
          </Route>
          <Route path="/cubes" element={<CubesPage />} />
          <Route path="/cubes/:qrToken" element={<CubeDetailPage />} />
          <Route path="*" element={<Navigate replace to="/batches" />} />
        </Route>
      </Routes>
    </ActiveBatchProvider>
  );
}

export default App;
