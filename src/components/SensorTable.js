import { Clock } from "lucide-react";

function SensorTable({
  readings,
}) {
  return (
    <div className="table-card">

      <div className="table-header">

        <div>
          <h3>
            Sensor History
          </h3>

          <p>
            Latest recorded sensor readings
          </p>
        </div>

        <div className="table-icon">
          <Clock size={20} />
        </div>

      </div>

      <div className="table-wrapper">

        <table>

          <thead>

            <tr>

              <th>
                #
              </th>

              <th>
                Date & Time
              </th>

              <th>
                Temperature
              </th>

              <th>
                Distance
              </th>

            </tr>

          </thead>

          <tbody>

            {readings.map(
              (reading, index) => (

                <tr
                  key={reading.id}
                >

                  <td>
                    {index + 1}
                  </td>

                  <td className="date-cell">
                    {new Date(
                      reading.recorded_at
                    ).toLocaleString()}
                  </td>

                  <td>
                    <span className="temperature-value">
                      {Number(
                        reading.temperature_c
                      ).toFixed(2)}
                      °C
                    </span>
                  </td>

                  <td>
                    <span className="distance-value">
                      {Number(
                        reading.distance_cm
                      ).toFixed(2)}
                      cm
                    </span>
                  </td>

                </tr>

              )
            )}

          </tbody>

        </table>

        {readings.length === 0 && (

          <div className="empty-table">
            No sensor readings available.
          </div>

        )}

      </div>

    </div>
  );
}

export default SensorTable;