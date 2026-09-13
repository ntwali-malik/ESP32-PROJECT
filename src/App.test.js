import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";

test("renders the sensor dashboard", () => {
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Analytics" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Readings" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Cube Registry" })).toBeInTheDocument();
});
