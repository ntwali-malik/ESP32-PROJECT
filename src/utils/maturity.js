const DATUM_C = -10;
const HOUR_MS = 3600000;

function contribution(temperatureC, fromMs, toMs) {
  return ((Number(temperatureC) - DATUM_C) * Math.max(toMs - fromMs, 0)) / HOUR_MS;
}

function orderedReadings(readings) {
  return readings
    .map((reading) => ({
      ...reading,
      time: new Date(reading.recorded_at).getTime(),
      temperature: Number(reading.temperature_c),
    }))
    .filter((reading) => Number.isFinite(reading.time) && Number.isFinite(reading.temperature))
    .sort((a, b) => a.time - b.time);
}

export function calculateMaturity(readings = [], now = Date.now()) {
  const sorted = orderedReadings(readings);
  if (!sorted.length) return 0;

  let cumulative = 0;
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    cumulative += contribution(previous.temperature, previous.time, sorted[index].time);
  }

  const last = sorted[sorted.length - 1];
  return cumulative + contribution(last.temperature, last.time, now);
}

export function maturityCurve(readings = [], now = Date.now()) {
  const sorted = orderedReadings(readings);
  let cumulative = 0;
  const points = sorted.map((reading, index) => {
    if (index > 0) {
      const previous = sorted[index - 1];
      cumulative += contribution(previous.temperature, previous.time, reading.time);
    }
    return { time: reading.time, temperature: reading.temperature, maturity: cumulative };
  });

  const last = sorted[sorted.length - 1];
  if (last && now > last.time) {
    points.push({
      time: now,
      temperature: last.temperature,
      maturity: calculateMaturity(sorted, now),
    });
  }
  return points;
}
