import {
  Thermometer,
  Ruler,
} from "lucide-react";

function SensorCard({
  type,
  value,
  unit,
  updated,
}) {
  const isTemperature =
    type === "temperature";

  const Icon = isTemperature
    ? Thermometer
    : Ruler;

  return (
    <div className="sensor-card">

      <div className="sensor-card-top">

        <div>

          <p className="sensor-label">
            {isTemperature
              ? "Temperature"
              : "Distance"}
          </p>

          <div className="sensor-value-row">

            <span className="sensor-value">
              {value}
            </span>

            <span className="sensor-unit">
              {unit}
            </span>

          </div>

        </div>

        <div
          className={`sensor-icon ${
            isTemperature
              ? "temperature-icon"
              : "distance-icon"
          }`}
        >
          <Icon size={26} />
        </div>

      </div>

      <div className="sensor-card-footer">

        <span>
          Last dashboard update
        </span>

        <strong>
          {updated}
        </strong>

      </div>

    </div>
  );
}

export default SensorCard;