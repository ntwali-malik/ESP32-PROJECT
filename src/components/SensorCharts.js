import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

function SensorCharts({
  readings,
}) {
  const chartData = [
    ...readings,
  ]
    .reverse()
    .map((reading) => ({
      time: new Date(
        reading.recorded_at
      ).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),

      temperature: Number(
        reading.temperature_c
      ),

      distance: Number(
        reading.distance_cm
      ),
    }));

  return (
    <div className="charts-grid">

      {/* Temperature */}

      <div className="chart-card">

        <div className="chart-header">

          <div>
            <h3>
              Temperature History
            </h3>

            <p>
              Temperature readings over time
            </p>
          </div>

          <div className="chart-badge temperature-badge">
            °C
          </div>

        </div>

        <div className="chart-container">

          {chartData.length > 0 ? (

            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 15,
                  left: 0,
                  bottom: 10,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                />

                <XAxis
                  dataKey="time"
                  tick={{
                    fontSize: 11,
                    fill: "#64748b",
                  }}
                />

                <YAxis
                  tick={{
                    fontSize: 11,
                    fill: "#64748b",
                  }}
                />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="temperature"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{
                    r: 6,
                  }}
                />

              </LineChart>
            </ResponsiveContainer>

          ) : (

            <div className="empty-chart">
              No temperature data available
            </div>

          )}

        </div>

      </div>

      {/* Distance */}

      <div className="chart-card">

        <div className="chart-header">

          <div>
            <h3>
              Distance History
            </h3>

            <p>
              Distance readings over time
            </p>
          </div>

          <div className="chart-badge distance-badge">
            cm
          </div>

        </div>

        <div className="chart-container">

          {chartData.length > 0 ? (

            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <LineChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 15,
                  left: 0,
                  bottom: 10,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                />

                <XAxis
                  dataKey="time"
                  tick={{
                    fontSize: 11,
                    fill: "#64748b",
                  }}
                />

                <YAxis
                  tick={{
                    fontSize: 11,
                    fill: "#64748b",
                  }}
                />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="distance"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{
                    r: 6,
                  }}
                />

              </LineChart>
            </ResponsiveContainer>

          ) : (

            <div className="empty-chart">
              No distance data available
            </div>

          )}

        </div>

      </div>

    </div>
  );
}

export default SensorCharts;