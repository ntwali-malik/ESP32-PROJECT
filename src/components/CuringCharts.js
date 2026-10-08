import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatTick(time) {
  return new Date(time).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function ChartCard({ title, description, unit, badgeClass, data, dataKey, color, digits }) {
  return (
    <article className="chart-card">
      <div className="chart-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className={`chart-badge ${badgeClass}`}>{unit}</div>
      </div>
      <div className="chart-container" style={{ height: 260 }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#ece7dc" strokeDasharray="4 4" />
              <XAxis dataKey="time" domain={["dataMin", "dataMax"]} minTickGap={40} scale="time" tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={formatTick} type="number" />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} width={44} />
              <Tooltip
                formatter={(value) => [`${Number(value).toFixed(digits)} ${unit}`, title]}
                labelFormatter={(time) => new Date(time).toLocaleString()}
              />
              <Line activeDot={{ r: 5 }} dataKey={dataKey} dot={false} isAnimationActive={false} stroke={color} strokeWidth={2.5} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-chart">No curing readings yet</div>
        )}
      </div>
    </article>
  );
}

// Expects points from maturityCurve(): { time, temperature, maturity }.
function CuringCharts({ points }) {
  return (
    <div className="charts-grid">
      <ChartCard badgeClass="temperature-badge" color="#c2410c" data={points} dataKey="temperature" description="Concrete temperature during curing" digits={2} title="Temperature" unit="°C" />
      <ChartCard badgeClass="distance-badge" color="#1d4ed8" data={points} dataKey="maturity" description="Nurse-Saul index, -10 °C datum" digits={1} title="Maturity" unit="°C·h" />
    </div>
  );
}

export default CuringCharts;
