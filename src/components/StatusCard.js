import { Database, Server, Wifi } from "lucide-react";

function StatusCard({ online, lastUpdate }) {
  return (
    <article className="status-card">
      <div className="status-top">
        <div>
          <p className="sensor-label">System status</p>
          <div className="status-title">
            <span className={`status-dot ${online ? "online" : "offline"}`} />
            <span>{online ? "Online" : "Offline"}</span>
          </div>
        </div>
        <div className={`status-icon ${online ? "status-online" : "status-offline"}`}>
          <Wifi size={24} />
        </div>
      </div>

      <div className="status-services">
        <div className="service">
          <Server size={18} />
          <div>
            <span>API server</span>
            <strong>{online ? "Connected" : "Disconnected"}</strong>
          </div>
        </div>
        <div className="service">
          <Database size={18} />
          <div>
            <span>Database</span>
            <strong>{online ? "Connected" : "Disconnected"}</strong>
          </div>
        </div>
      </div>

      <div className="sensor-card-footer">
        <div>
          <span>Last sensor reading</span>
          <strong>{lastUpdate}</strong>
        </div>
      </div>
    </article>
  );
}

export default StatusCard;
