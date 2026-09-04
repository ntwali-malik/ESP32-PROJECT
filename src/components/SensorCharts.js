import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function SensorCharts({ readings, height = 300 }) {
  const chartData = [...readings].reverse().map((reading) => ({
    time: new Date(reading.recorded_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    temperature: Number(reading.temperature_c),
    distance: Number(reading.distance_cm),
  }));

  return (
    <div className="charts-grid">
      <article className="chart-card">
        <div className="chart-header">
          <div>
            <h3>Temperature history</h3>
            <p>Readings over the latest samples</p>
          </div>
          <div className="chart-badge temperature-badge">°C</div>
        </div>
        <div className="chart-container" style={{ height }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#ece7dc" strokeDasharray="4 4" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke="#c2410c"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">No temperature data available</div>
          )}
        </div>
      </article>

      <article className="chart-card">
        <div className="chart-header">
          <div>
            <h3>Distance history</h3>
            <p>Readings over the latest samples</p>
          </div>
          <div className="chart-badge distance-badge">cm</div>
        </div>
        <div className="chart-container" style={{ height }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#ece7dc" strokeDasharray="4 4" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="distance"
                  stroke="#1d4ed8"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">No distance data available</div>
          )}
        </div>
      </article>
    </div>
  );
}

export default SensorCharts;
