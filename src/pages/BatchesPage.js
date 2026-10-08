import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Beaker, ChevronRight, CircleAlert, Plus } from "lucide-react";

import PageHeader from "../components/PageHeader";
import { useActiveBatch } from "../context/ActiveBatchContext";
import { getBatches } from "../services/api";
import { SLUMP_STATUS_LABELS } from "../utils/mix";

function BatchesPage() {
  const { batchId: activeId } = useActiveBatch();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => getBatches())
      .then((response) => {
        if (!cancelled) setBatches(response?.data || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || "Unable to load concrete batches.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="batch-registry-page">
      <PageHeader
        eyebrow="Production"
        icon={Beaker}
        title="Batches"
        description="Every pour starts here. Create a batch to design the mix and register specimens, then open it to run slump, curing and strength checks."
        actions={<Link className="primary-button" to="/batches/new"><Plus size={16} />New batch</Link>}
      />

      <ol aria-label="Quality control workflow" className="workflow-overview">
        <li><span>1</span><div><strong>Design mix</strong><small>Ratios, w/c and specimens</small></div></li>
        <li><span>2</span><div><strong>Slump check</strong><small>Approve workability</small></div></li>
        <li><span>3</span><div><strong>Curing capture</strong><small>Live ESP32 maturity</small></div></li>
        <li><span>4</span><div><strong>Strength tests</strong><small>Early-age and final</small></div></li>
        <li><span>5</span><div><strong>Report</strong><small>Projection vs actual</small></div></li>
      </ol>

      {error && <div className="cube-notice error-alert"><CircleAlert size={18} />{error}</div>}

      <section className="batch-panel batch-list-panel">
        <div className="section-heading">
          <div><h2>All batches</h2><p>Open a batch to continue where it left off.</p></div>
          <span className="count-badge">{batches.length}</span>
        </div>
        {loading ? <p className="empty-cubes">Loading batches...</p> : batches.length ? (
          <div className="batch-list">
            {batches.map((batch) => {
              const isActive = String(batch.id) === String(activeId);
              return (
                <Link className={`batch-list-row ${isActive ? "is-active" : ""}`} key={batch.id} to={`/batches/${batch.id}`}>
                  <span>
                    <strong>{batch.batch_number}{isActive && <em className="active-tag">Active</em>}</strong>
                    <small>{batch.concrete_grade} · {batch.specimen_quantity} {batch.specimen_shape} specimens · cast {batch.casting_date}</small>
                  </span>
                  <span className="batch-row-end">
                    <span className={`status-pill slump-${batch.slump_status}`}>{SLUMP_STATUS_LABELS[batch.slump_status] || batch.slump_status?.replaceAll("_", " ")}</span>
                    <ChevronRight size={16} />
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Beaker size={26} />
            <h3>No batches yet</h3>
            <p>Create your first batch to calculate material quantities and register its specimens.</p>
            <Link className="primary-button" to="/batches/new"><Plus size={16} />Start a new batch</Link>
          </div>
        )}
      </section>
    </div>
  );
}

export default BatchesPage;
