import { calculateMix, slumpFromDistanceCm, slumpPasses, specimenVolumeM3 } from "./mix";

test("calculates the volume of one 150 mm cube", () => {
  expect(specimenVolumeM3("cube", { side_mm: 150 }, 1)).toBeCloseTo(0.003375, 8);
});

test("converts specimen volume to a 1:2:4 batch quantity", () => {
  const mix = calculateMix(0.003375, { cement: 1, sand: 2, aggregate: 4 }, 0.5);
  expect(mix.dryVolumeM3).toBeCloseTo(0.0051975, 7);
  expect(mix.cementKg).toBeCloseTo(1.068, 2);
  expect(mix.waterLiters).toBeCloseTo(mix.cementKg * 0.5, 8);
});

test("approves only slump readings inside the selected class range", () => {
  expect(slumpPasses(100, "S3")).toBe(true);
  expect(slumpPasses(99, "S3")).toBe(false);
});

test("converts the ultrasonic reading in cm to a slump in mm", () => {
  expect(slumpFromDistanceCm(11.5)).toBe(115);
  expect(slumpFromDistanceCm("8.234")).toBe(82.3);
  expect(slumpFromDistanceCm(null)).toBeNull();
  expect(slumpFromDistanceCm(-1)).toBeNull();
});