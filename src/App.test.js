import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";
import * as api from "./services/api";

jest.mock("./services/api", () => ({
  checkHealth: jest.fn(),
  getBatches: jest.fn(),
  getBatch: jest.fn(),
}));

const batchData = {
  batch: {
    id: 7,
    batch_number: "BATCH-TEST",
    concrete_grade: "C25/30",
    casting_date: "2026-10-01",
    test_age_days: 28,
    specimen_quantity: 2,
    specimen_shape: "cube",
    slump_class: "S3",
    slump_status: "approved",
    measured_slump_mm: 120,
  },
  specimens: [
    { id: 1, cube_number: "CUBE-001", qr_token: "tok-1", status: "registered", specimen_shape: "cube" },
  ],
  tests: [],
  curing_readings: [
    { id: 11, temperature_c: 22.5, distance_cm: 10, recorded_at: "2026-10-01T10:00:00Z" },
  ],
  curing_session: { id: 3, started_at: "2026-10-01T09:00:00Z", ended_at: null },
  maturity_index: 812.4,
  strength_projection: null,
};

beforeEach(() => {
  window.localStorage.clear();
  // CRA resets mock implementations before each test, so set them here.
  api.checkHealth.mockResolvedValue({ success: true });
  api.getBatches.mockResolvedValue({ data: [] });
  api.getBatch.mockResolvedValue({ data: batchData });
});

function renderAt(path = "/") {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );
}

test("lands on the batch list with a clear way to start", async () => {
  renderAt("/");

  expect(await screen.findByRole("heading", { name: "Batches" })).toBeInTheDocument();
  expect(await screen.findByText("No batches yet")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Batches" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Cube Registry" })).toBeInTheDocument();
  expect(await screen.findByText("Sensor API online")).toBeInTheDocument();
});

test("old sensor URLs fall back to the batch list", async () => {
  renderAt("/analytics");

  expect(await screen.findByRole("heading", { name: "Batches" })).toBeInTheDocument();
});

test("new batch flow opens the wizard and advances from mix design to specimens", async () => {
  renderAt("/batches");

  fireEvent.click(await screen.findByRole("link", { name: "Start a new batch" }));
  expect(await screen.findByRole("heading", { name: "Prepare a concrete batch" })).toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("BatchesNew batch");

  fireEvent.change(screen.getByLabelText("Concrete grade"), { target: { value: "C25/30" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue to specimen setup" }));

  expect(screen.getByRole("heading", { name: "02 / Set specimen geometry" })).toBeInTheDocument();
  expect(screen.getByLabelText("Specimen shape")).toBeInTheDocument();
});

test("a batch opens as a workspace with section tabs", async () => {
  renderAt("/batches/7");

  expect(await screen.findByRole("heading", { name: "BATCH-TEST" })).toBeInTheDocument();
  const tabs = screen.getByRole("navigation", { name: "Batch sections" });
  for (const name of ["Summary", "Slump", "Curing & sensors", "Specimens", "Report"]) {
    expect(tabs).toHaveTextContent(name);
  }
  expect(screen.getByRole("heading", { name: "Batch details" })).toBeInTheDocument();
  expect(window.localStorage.getItem("qc_active_batch_id")).toBe("7");
});

test("the curing tab shows live sensor data for the batch", async () => {
  renderAt("/batches/7/curing");

  expect(await screen.findByText("Curing capture is live")).toBeInTheDocument();
  expect(screen.getByText("812.4")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Curing log" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Stop capture" })).toBeInTheDocument();
});

test("the sidebar shows the current batch and closing it removes the shortcut", async () => {
  window.localStorage.setItem("qc_active_batch_id", "7");
  renderAt("/batches");

  expect(await screen.findByRole("link", { name: "BATCH-TEST" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));

  expect(screen.queryByRole("link", { name: "BATCH-TEST" })).not.toBeInTheDocument();
  expect(window.localStorage.getItem("qc_active_batch_id")).toBeNull();
});
