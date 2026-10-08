import { useEffect, useMemo, useState } from "react";
import { Activity, ChevronLeft, ChevronRight, Clock, Lock, Play, Square, Thermometer } from "lucide-react";

import CuringCharts from "../../components/CuringCharts";
import { setCuringSession } from "../../services/api";
import { formatNumber } from "../../utils/format";
import { calculateMaturity, maturityCurve } from "../../utils/maturity";
import { useBatchWorkspace } from "./BatchWorkspace";

const PAGE_SIZES = [10, 25, 50];

function formatElapsed(fromIso) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(fromIso).getTime()) / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days) return `${days}d ${hours}h`;
  return `${hours}h ${minutes % 60}m`;
}

function CuringTab() {
  const { batchData, sessionActive, reload, notify, fail } = useBatchWorkspace();
  const { batch, curing_readings: readings, curing_session: session } = batchData;
  const [saving, setSaving] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const slumpApproved = batch.slump_status === "approved";
  const maturity = useMemo(() => calculateMaturity(readings), [readings]);
  const points = useMemo(() => maturityCurve(readings), [readings]);
  const newestFirst = useMemo(() => [...readings].reverse(), [readings]);
  const latest = newestFirst[0];

  const filtered = useMemo(() => newestFirst.filter((reading) => {
    const recorded = new Date(reading.recorded_at);
    if (fromDate && recorded < new Date(`${fromDate}T00:00:00`)) return false;
    if (toDate && recorded > new Date(`${toDate}T23:59:59.999`)) return false;
    return true;
  }), [fromDate, newestFirst, toDate]);

  useEffect(() => { setPage(1); }, [fromDate, toDate, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paged = filtered.slice(startIndex, startIndex + pageSize);

  const toggleCapture = async () => {
    const action = sessionActive ? "stop" : "start";
    setSaving(true);
    try {
      await setCuringSession(batch.id, action);
      await reload();
      notify(action === "start" ? "Curing capture started. ESP32 readings are now linked to this batch." : "Curing capture stopped.");
    } catch (err) {
      fail(err.response?.data?.message || "Unable to update curing capture.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className={`capture-bar ${sessionActive ? "active" : ""}`}>
        <div className="capture-bar-info">
          <span className="capture-bar-icon">{slumpApproved ? <Activity size={18} /> : <Lock size={18} />}</span>
          <div>
            <strong>{sessionActive ? "Curing capture is live" : slumpApproved ? "Curing capture is stopped" : "Curing capture is locked"}</strong>
            <small>
              {sessionActive
                ? `Running for ${formatElapsed(session.started_at)} · refreshing every 5 seconds`
                : slumpApproved
                  ? "Start capture to link incoming ESP32 readings to this batch."
                  : "Record an approved slump result first."}
            </small>
          </div>
        </div>
        <button className={sessionActive ? "secondary-button" : "primary-button"} disabled={saving || (!sessionActive && !slumpApproved)} onClick={toggleCapture} type="button">
          {sessionActive ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          {saving ? "Saving..." : sessionActive ? "Stop capture" : "Start capture"}
        </button>
      </section>

      <div className="kpi-grid">
        <article className="kpi-tile">
          <span className="kpi-label"><Thermometer size={15} />Latest temperature</span>
          <strong>{latest ? formatNumber(latest.temperature_c, 2) : "--"}<small>°C</small></strong>
          <span className="kpi-meta">{latest ? new Date(latest.recorded_at).toLocaleString() : "No readings yet"}</span>
        </article>
        <article className="kpi-tile">
          <span className="kpi-label"><Activity size={15} />Maturity index</span>
          <strong>{formatNumber(maturity, 1)}<small>°C·h</small></strong>
          <span className="kpi-meta">Nurse-Saul, -10 °C datum</span>
        </article>
        <article className="kpi-tile">
          <span className="kpi-label"><Clock size={15} />Readings captured</span>
          <strong>{readings.length}</strong>
          <span className="kpi-meta">{session ? `Session started ${new Date(session.started_at).toLocaleString()}` : "No session yet"}</span>
        </article>
      </div>

      <CuringCharts points={points} />

      <section className="table-card curing-log">
        <div className="table-header">
          <div>
            <h3>Curing log</h3>
            <p>{filtered.length ? `Showing ${startIndex + 1}–${startIndex + paged.length} of ${filtered.length} readings` : "No readings in this range"}</p>
          </div>
          <div className="curing-log-filters">
            <label>From<input max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} type="date" value={fromDate} /></label>
            <label>To<input min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} type="date" value={toDate} /></label>
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead><tr><th>#</th><th>Recorded</th><th>Temperature</th><th>Distance</th></tr></thead>
            <tbody>
              {paged.map((reading, index) => (
                <tr key={reading.id}>
                  <td>{startIndex + index + 1}</td>
                  <td className="date-cell">{new Date(reading.recorded_at).toLocaleString()}</td>
                  <td><span className="temperature-value">{formatNumber(reading.temperature_c, 2)} °C</span></td>
                  <td>{formatNumber(reading.distance_cm, 2)} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
          {paged.length === 0 && <div className="empty-table">{readings.length ? "No readings match this date range." : "No curing readings recorded yet."}</div>}
        </div>
        <div className="pagination">
          <label className="page-size">
            Rows
            <select onChange={(event) => setPageSize(Number(event.target.value))} value={pageSize}>
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <div className="pagination-controls">
            <button className="secondary-button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} type="button"><ChevronLeft size={16} />Previous</button>
            <span className="page-status">Page {currentPage} of {totalPages}</span>
            <button className="secondary-button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} type="button">Next<ChevronRight size={16} /></button>
          </div>
        </div>
      </section>
    </>
  );
}

export default CuringTab;
