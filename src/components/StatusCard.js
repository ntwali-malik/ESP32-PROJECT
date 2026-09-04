import {
  Wifi,
  Server,
  Database,
} from "lucide-react";

function StatusCard({
  online,
  lastUpdate,
}) {
  return (
    <div className="status-card">

      <div className="status-top">

        <div>

          <p className="sensor-label">
            System Status
          </p>

          <div className="status-title">

            <span
              className={`status-dot ${
                online
                  ? "online"
                  : "offline"
              }`}
            />

            <span>
              {online
                ? "Online"
                : "Offline"}
            </span>

          </div>

        </div>

        <div
          className={`status-icon ${
            online
              ? "status-online"
              : "status-offline"
          }`}
        >
          <Wifi size={26} />
        </div>

      </div>

      <div className="status-services">

        <div className="service">

          <Server size={19} />

          <div>
            <span>
              API Server
            </span>

            <strong>
              {online
                ? "Connected"
                : "Disconnected"}
            </strong>
          </div>

        </div>

        <div className="service">

          <Database size={19} />

          <div>
            <span>
              Database
            </span>

            <strong>
              {online
                ? "Connected"
                : "Disconnected"}
            </strong>
          </div>

        </div>

      </div>

      <div className="sensor-card-footer">

        <span>
          Last sensor reading
        </span>

        <strong>
          {lastUpdate}
        </strong>

      </div>

    </div>
  );
}

export default StatusCard;