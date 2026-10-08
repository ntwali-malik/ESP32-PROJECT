import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useOutletContext, useParams } from "react-router-dom";
import { ArrowRight, Beaker, Check, CheckCircle2, CircleAlert } from "lucide-react";

import Breadcrumbs from "../../components/Breadcrumbs";
import PageHeader from "../../components/PageHeader";
import { useActiveBatch } from "../../context/ActiveBatchContext";
import { getBatch } from "../../services/api";

const TABS = [
  { to: "", label: "Summary", end: true },
  { to: "slump", label: "Slump" },
  { to: "curing", label: "Curing & sensors" },
  { to: "specimens", label: "Specimens" },
  { to: "report", label: "Report" },
];

const STEP_STATUS_TEXT = { done: "Complete", current: "In progress", attention: "Needs attention", upcoming: "Not started" };

// Derives where the batch is in the QC lifecycle and what the operator should do next.
function lifecycle({ batch, readings, sessionActive, tests, finalTests, projection }) {
  const slumpApproved = batch.slump_status === "approved";
  const curingDone = slumpApproved && readings.length > 0 && !sessionActive;
  const steps = [
    { key: "mix", label: "Mix design", tab: "", state: "done" },
    {
      key: "slump",
      label: "Slump check",
      tab: "slump",
      state: slumpApproved ? "done" : batch.slump_status === "adjustment_required" ? "attention" : "current",
    },
    { key: "curing", label: "Curing capture", tab: "curing", state: !slumpApproved ? "upcoming" : curingDone ? "done" : "current" },
    {
      key: "testing",
      label: "Strength tests",
      tab: "specimens",
      state: finalTests.length ? "done" : tests.length || curingDone ? "current" : "upcoming",
    },
    { key: "report", label: "Report", tab: "report", state: finalTests.length ? "done" : projection ? "current" : "upcoming" },
  ];

  let next;
  if (!slumpApproved) {
    next = {
      title: batch.slump_status === "adjustment_required" ? "Adjust the mix and re-test slump" : "Capture and record the slump",
      text: "Run the ultrasonic capture to fill in the slump, then record it. Curing capture unlocks once it falls inside the selected class.",
      tab: "slump",
      action: "Go to slump check",
    };
  } else if (sessionActive) {
    next = {
      title: "Curing capture is running",
      text: "Incoming ESP32 readings are building this batch's maturity index.",
      tab: "curing",
      action: "View live curing",
    };
  } else if (!readings.length) {
    next = {
      title: "Start curing capture",
      text: "Begin capturing so sensor readings build the maturity index for this batch.",
      tab: "curing",
      action: "Go to curing",
    };
  } else if (!finalTests.length) {
    next = {
      title: "Record specimen strength tests",
      text: "Open a specimen to log early-age calibration tests or the final compression result.",
      tab: "specimens",
      action: "Choose a specimen",
    };
  } else {
    next = {
      title: "Batch complete",
      text: "Final results are recorded. Review the strength report against the projection.",
      tab: "report",
      action: "View report",
    };
  }

  return { steps, next };
}

function BatchWorkspace() {
  const { batchId } = useParams();
  const location = useLocation();
  const { selectBatch } = useActiveBatch();
  const [batchData, setBatchData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.created ? "Batch registered. Capture the slump with the ultrasonic sensor to continue." : "");

  const reload = useCallback(async () => {
    try {
      const response = await getBatch(batchId);
      setBatchData(response.data);
      setError("");
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load this batch.");
      return null;
    }
  }, [batchId]);

  const sessionActive = Boolean(batchData?.curing_session && !batchData.curing_session.ended_at);

  // Refresh faster while sensors are feeding this batch.
  useEffect(() => {
    reload();
    const timer = window.setInterval(reload, sessionActive ? 5000 : 15000);
    return () => window.clearInterval(timer);
  }, [reload, sessionActive]);

  // Opening a batch makes it the current batch in the sidebar.
  const loadedBatch = batchData?.batch;
  useEffect(() => {
    if (loadedBatch) selectBatch(loadedBatch);
  }, [loadedBatch, selectBatch]);

  // Notices belong to the tab that raised them.
  useEffect(() => {
    if (!location.state?.created) setNotice("");
  }, [location.pathname, location.state]);

  const notify = useCallback((text) => {
    setError("");
    setNotice(text);
  }, []);

  const fail = useCallback((text) => {
    setNotice("");
    setError(text);
  }, []);

  const base = `/batches/${batchId}`;
  const crumbs = [{ label: "Batches", to: "/batches" }, { label: batchData?.batch.batch_number || "Batch" }];

  if (!batchData) {
    return (
      <div className="batch-detail-page">
        <Breadcrumbs items={crumbs} />
        {error ? <div className="cube-notice error-alert"><CircleAlert size={18} />{error}</div> : <p className="empty-cubes">Loading batch...</p>}
      </div>
    );
  }

  const { batch, tests, curing_readings: readings, strength_projection: projection } = batchData;
  const finalTests = tests.filter((test) => test.test_stage === "final");
  const { steps, next } = lifecycle({ batch, readings, sessionActive, tests, finalTests, projection });
  const tabPath = (tab) => (tab ? `${base}/${tab}` : base);
  const onNextTab = location.pathname.replace(/\/$/, "") === tabPath(next.tab);

  return (
    <div className="batch-detail-page">
      <Breadcrumbs items={crumbs} />
      <PageHeader
        eyebrow="Concrete batch"
        icon={Beaker}
        title={batch.batch_number}
        description={`${batch.concrete_grade} · Cast ${batch.casting_date} · ${batch.specimen_quantity} ${batch.specimen_shape} specimens · ${batch.test_age_days}-day test`}
        actions={sessionActive && (
          <Link className="live-chip online" to={`${base}/curing`}>
            <span className="live-pulse" />Curing capture live
          </Link>
        )}
      />

      <ol aria-label="Batch progress" className="lifecycle">
        {steps.map((step, index) => (
          <li className={`lifecycle-step ${step.state}`} key={step.key}>
            <Link to={tabPath(step.tab)}>
              <span className="lifecycle-marker">{step.state === "done" ? <Check size={14} /> : index + 1}</span>
              <span className="lifecycle-text"><strong>{step.label}</strong><small>{STEP_STATUS_TEXT[step.state]}</small></span>
            </Link>
          </li>
        ))}
      </ol>

      {!onNextTab && (
        <section className="next-action">
          <div>
            <span className="next-action-label">Next step</span>
            <h3>{next.title}</h3>
            <p>{next.text}</p>
          </div>
          <Link className="primary-button" to={tabPath(next.tab)}>{next.action}<ArrowRight size={16} /></Link>
        </section>
      )}

      <nav aria-label="Batch sections" className="workspace-tabs">
        {TABS.map((tab) => (
          <NavLink className={({ isActive }) => `workspace-tab ${isActive ? "active" : ""}`} end={tab.end} key={tab.label} to={tabPath(tab.to)}>
            {tab.label}
            {tab.to === "curing" && sessionActive && <span className="tab-live-dot" aria-label="live" />}
          </NavLink>
        ))}
      </nav>

      {error && <div className="cube-notice error-alert"><CircleAlert size={18} />{error}</div>}
      {notice && <div className="cube-notice success-alert"><CheckCircle2 size={18} />{notice}</div>}

      <div className="workspace-panel">
        <Outlet context={{ batchData, sessionActive, finalTests, reload, notify, fail }} />
      </div>
    </div>
  );
}

export function useBatchWorkspace() {
  return useOutletContext();
}

export default BatchWorkspace;
