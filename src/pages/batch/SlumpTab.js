import { useState } from "react";
import { Beaker } from "lucide-react";

import UltrasonicSlumpCapture from "../../components/UltrasonicSlumpCapture";
import { recordBatchSlump } from "../../services/api";
import { formatNumber } from "../../utils/format";
import { SLUMP_CLASSES, slumpFromDistanceCm } from "../../utils/mix";
import { useBatchWorkspace } from "./BatchWorkspace";

function SlumpTab() {
  const { batchData, reload, notify, fail } = useBatchWorkspace();
  const { batch } = batchData;
  const [slumpCapture, setSlumpCapture] = useState(null);
  const [saving, setSaving] = useState(false);
  const slumpSource = slumpCapture?.batchId === batch.id ? slumpCapture.reading : null;
  const slumpValue = slumpSource ? String(slumpFromDistanceCm(slumpSource.distance_cm)) : "";

  const handleSave = async (event) => {
    event.preventDefault();
    const measuredSlumpMm = slumpFromDistanceCm(slumpSource?.distance_cm);
    if (measuredSlumpMm === null) {
      fail("Capture a slump reading from the sensor before recording it.");
      return;
    }

    setSaving(true);
    try {
      await recordBatchSlump(batch.id, measuredSlumpMm, batch.slump_class);
      const data = await reload();
      setSlumpCapture(null);
      notify(data?.batch.slump_status === "approved"
        ? "Slump approved. Curing capture is now unlocked."
        : "Slump recorded, but it is outside the selected class. Adjust the mix and re-test.");
    } catch (err) {
      fail(err.response?.data?.message || "Unable to save the slump result.");
    } finally {
      setSaving(false);
    }
  };

  const range = SLUMP_CLASSES[batch.slump_class];

  return (
    <div className="batch-summary-grid">
      <section className="batch-panel">
        <div className="form-title"><Beaker size={18} /><h3>Slump check</h3></div>
        <p className="batch-ratio">Target class {batch.slump_class}: {range?.description}</p>
        <UltrasonicSlumpCapture
          disabled={saving}
          onCaptured={(slump, reading) => {
            setSlumpCapture({ batchId: batch.id, reading });
          }}
        />
        <form className="slump-form" onSubmit={handleSave}>
          <label>Measured slump (mm)<input readOnly type="number" value={slumpValue} /></label>
          <button className="primary-button" disabled={saving || !slumpSource} type="submit">{saving ? "Saving..." : "Record slump"}</button>
          {slumpSource && (
            <p className="slump-source">
              Auto-filled from ultrasonic reading {formatNumber(slumpSource.distance_cm, 2)} cm at {new Date(slumpSource.recorded_at).toLocaleTimeString()}. Review and record to confirm.
            </p>
          )}
        </form>
      </section>

      <section className="batch-panel">
        <div className="form-title"><Beaker size={18} /><h3>Result</h3></div>
        <div className={`slump-result ${batch.slump_status}`}>
          <strong>{batch.slump_status === "approved" ? "Approved" : batch.slump_status === "adjustment_required" ? "Adjustment required" : "Awaiting measurement"}</strong>
          <span>{batch.measured_slump_mm == null ? "No slump value recorded" : `${formatNumber(batch.measured_slump_mm, 1)} mm against ${batch.slump_class} (${range?.description})`}</span>
        </div>
        <ol className="procedure-list">
          <li>Fill the cone and place it under the ultrasonic sensor.</li>
          <li>Press <strong>Start capture</strong>, lift the cone and let the concrete settle.</li>
          <li>Press <strong>Stop capture</strong>. The final sensor reading fills the slump in mm.</li>
          <li>Review the captured value and press <strong>Record slump</strong>.</li>
        </ol>
      </section>
    </div>
  );
}

export default SlumpTab;
