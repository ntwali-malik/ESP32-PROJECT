export const SPECIMEN_PRESETS = {
  cube: { side_mm: 150 },
  cylinder: { diameter_mm: 150, height_mm: 300 },
  beam: { length_mm: 500, width_mm: 100, height_mm: 100 },
  custom: { length_mm: 150, width_mm: 150, height_mm: 150 },
};

export const SLUMP_CLASSES = {
  S1: { minimum: 10, maximum: 40, description: "10-40 mm" },
  S2: { minimum: 50, maximum: 90, description: "50-90 mm" },
  S3: { minimum: 100, maximum: 150, description: "100-150 mm" },
  S4: { minimum: 160, maximum: 210, description: "160-210 mm" },
  S5: { minimum: 220, maximum: Infinity, description: "220 mm or more" },
};

export function specimenVolumeM3(shape, dimensions, quantity) {
  const dimension = (key) => Number(dimensions?.[key]);
  let oneSpecimenMm3 = 0;

  if (shape === "cube") {
    oneSpecimenMm3 = dimension("side_mm") ** 3;
  } else if (shape === "cylinder") {
    oneSpecimenMm3 = Math.PI * (dimension("diameter_mm") / 2) ** 2 * dimension("height_mm");
  } else {
    oneSpecimenMm3 = dimension("length_mm") * dimension("width_mm") * dimension("height_mm");
  }

  if (!Number.isFinite(oneSpecimenMm3) || oneSpecimenMm3 <= 0 || Number(quantity) <= 0) return 0;
  return (oneSpecimenMm3 * Number(quantity)) / 1e9;
}

export function calculateMix(volumeM3, mixRatio, waterCementRatio) {
  const ratioParts = [mixRatio.cement, mixRatio.sand, mixRatio.aggregate].map(Number);
  const totalParts = ratioParts.reduce((sum, part) => sum + part, 0);
  const dryVolumeM3 = Number(volumeM3) * 1.54;
  if (ratioParts.some((part) => !Number.isFinite(part) || part <= 0) || !Number.isFinite(dryVolumeM3)) {
    return { dryVolumeM3: 0, cementKg: 0, sandKg: 0, aggregateKg: 0, waterLiters: 0 };
  }

  const cementVolume = (ratioParts[0] / totalParts) * dryVolumeM3;
  const sandVolume = (ratioParts[1] / totalParts) * dryVolumeM3;
  const aggregateVolume = (ratioParts[2] / totalParts) * dryVolumeM3;
  const cementKg = cementVolume * 1440;

  return {
    dryVolumeM3,
    cementKg,
    sandKg: sandVolume * 1600,
    aggregateKg: aggregateVolume * 1500,
    waterLiters: cementKg * Number(waterCementRatio),
  };
}

// The ultrasonic sensor reports the slump directly, in centimetres.
export function slumpFromDistanceCm(distanceCm) {
  const value = Number(distanceCm);
  if (distanceCm === null || distanceCm === undefined || distanceCm === "" || !Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 10;
}

export function slumpPasses(measuredSlumpMm, slumpClass) {
  const value = Number(measuredSlumpMm);
  const range = SLUMP_CLASSES[slumpClass];
  return Boolean(range && Number.isFinite(value) && value >= range.minimum && value <= range.maximum);
}

export const SLUMP_STATUS_LABELS = {
  approved: "Slump approved",
  adjustment_required: "Adjustment required",
  pending: "Awaiting slump",
};
