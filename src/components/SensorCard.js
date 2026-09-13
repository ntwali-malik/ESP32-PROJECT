import { ArrowDownRight, ArrowUpRight, Ruler, Thermometer } from "lucide-react";

function SensorCard({ type, value, unit, updated, delta }) {
  const isTemperature = type === "temperature";
  const Icon = isTemperature ? Thermometer : Ruler;
  const hasDelta =
    typeof delta === "number" && !Number.isNaN(delta) && Math.abs(delta) >= 0.01;

  return (
    <article className={`sensor-card ${isTemperature ? "temp-card" : "distance-card"}`}>
      <div className="sensor-card-top">
        <div>
          <p className="sensor-label">
            {isTemperature ? "Temperature" : "Distance"}
          </p>
          <div className="sensor-value-row">
            <span className="sensor-value">{value}</span>
            <span className="sensor-unit">{unit}</span>
          </div>
        </div>
        <div className={`sensor-icon ${isTemperature ? "temperature-icon" : "distance-icon"}`}>
          <Icon size={24} />
        </div>
      </div>

      <div className="sensor-card-footer">
        <div>
          <span>Updated</span>
          <strong>{updated}</strong>
        </div>
        {hasDelta && (
          <span className={`delta ${delta >= 0 ? "up" : "down"}`}>
            {delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(2)} {unit}
          </span>
        )}
      </div>
    </article>
  );
}

export default SensorCard;
