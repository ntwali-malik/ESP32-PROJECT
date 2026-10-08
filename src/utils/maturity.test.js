import { calculateMaturity, maturityCurve } from "./maturity";

const at = (hours) => new Date(Date.UTC(2026, 9, 7, hours)).toISOString();

test("accumulates temperature above the -10 C datum over time", () => {
  const readings = [
    { recorded_at: at(0), temperature_c: 20 },
    { recorded_at: at(2), temperature_c: 30 },
  ];
  const now = new Date(at(2)).getTime();
  const curve = maturityCurve(readings, null, now);
  expect(curve.map((point) => point.maturity)).toEqual([0, 60]);
});

test("uses each captured temperature for the following interval", () => {
  const readings = [
    { recorded_at: at(0), temperature_c: 20 },
    { recorded_at: at(2), temperature_c: 30 },
  ];
  const now = new Date(at(3)).getTime();
  expect(calculateMaturity(readings, now)).toBe(100);
  expect(maturityCurve(readings, now).map((point) => point.maturity)).toEqual([0, 60, 100]);
});

test("allows negative contribution below the datum", () => {
  const readings = [
    { recorded_at: at(0), temperature_c: -15 },
    { recorded_at: at(2), temperature_c: -15 },
  ];
  expect(calculateMaturity(readings, new Date(at(2)).getTime())).toBe(-10);
});
