import { ClipboardList, Info } from "lucide-react";

import { formatNumber } from "../../utils/format";
import { calculateMaturity } from "../../utils/maturity";
import { SLUMP_CLASSES, SLUMP_STATUS_LABELS } from "../../utils/mix";
import { useBatchWorkspace } from "./BatchWorkspace";

function SummaryTab() {
  const { batchData, sessionActive, finalTests } = useBatchWorkspace();
  const { batch, specimens, curing_readings: readings } = batchData;
  const maturity = calculateMaturity(readings);

  const facts = [
    ["Concrete grade", batch.concrete_grade],
    ["Casting date", batch.casting_date],
    ["Final test age", `${batch.test_age_days} days`],
    ["Slump", batch.measured_slump_mm == null ? `${batch.slump_class} · not measured` : `${formatNumber(batch.measured_slump_mm, 1)} mm · ${SLUMP_STATUS_LABELS[batch.slump_status] || batch.slump_status}`],
    ["Curing capture", sessionActive ? "Capturing" : "Stopped"],
    ["Maturity index", `${formatNumber(maturity, 1)} °C·h`],
    ["Specimens", `${specimens.length} ${batch.specimen_shape}`],
    ["Final results", `${finalTests.length} of ${specimens.length}`],
  ];

  return (
    <div className="batch-summary-grid">
      <section className="batch-panel">
        <div className="form-title"><Info size={18} /><h3>Batch details</h3></div>
        <dl className="quantity-list">
          {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      </section>

      <section className="batch-panel">
        <div className="form-title"><ClipboardList size={18} /><h3>Calculated quantities</h3></div>
        <p className="batch-ratio">Mix {batch.cement_ratio}:{batch.sand_ratio}:{batch.aggregate_ratio} · w/c {batch.water_cement_ratio} · slump class {batch.slump_class} ({SLUMP_CLASSES[batch.slump_class]?.description})</p>
        <dl className="quantity-list">
          <div><dt>Wet specimen volume</dt><dd>{formatNumber(batch.wet_volume_m3, 6)} m3</dd></div>
          <div><dt>Dry volume x 1.54</dt><dd>{formatNumber(batch.dry_volume_m3, 6)} m3</dd></div>
          <div><dt>Cement</dt><dd>{formatNumber(batch.cement_kg)} kg</dd></div>
          <div><dt>Water</dt><dd>{formatNumber(batch.water_liters)} L</dd></div>
          <div><dt>Sand</dt><dd>{formatNumber(batch.sand_kg)} kg</dd></div>
          <div><dt>Aggregate</dt><dd>{formatNumber(batch.aggregate_kg)} kg</dd></div>
        </dl>
      </section>
    </div>
  );
}

export default SummaryTab;
