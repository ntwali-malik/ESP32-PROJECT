import { ClipboardList } from "lucide-react";

import { formatNumber } from "../../utils/format";
import { useBatchWorkspace } from "./BatchWorkspace";

function ReportTab() {
  const { batchData, finalTests } = useBatchWorkspace();
  const { strength_projection: projection } = batchData;

  return (
    <section className="batch-panel report-panel">
      <div className="form-title"><ClipboardList size={18} /><h3>Strength report</h3></div>
      {!projection ? <p className="batch-ratio">At least two early-age tests with distinct maturity indices are needed to fit the calibration line.</p> : (
        <>
          <p className="batch-ratio">Calibration: strength = {formatNumber(projection.intercept, 3)} + {formatNumber(projection.slope, 5)} x maturity</p>
          {projection.projections ? <div className="projection-grid">{projection.projections.map((item) => <div key={item.age_days}><span>{item.age_days} days</span><strong>{formatNumber(item.estimated_strength_mpa, 2)} MPa</strong></div>)}</div> : <p className="batch-ratio">Projection will be available once the batch is at least one day old and curing readings are present.</p>}
          <p className="projection-note">These OPC-ratio values are estimates. They do not replace a compression test.</p>
        </>
      )}
      <h4>Actual final test results</h4>
      {finalTests.length ? finalTests.map((test) => <div className="actual-result" key={test.id}><strong>{test.cube_number}</strong><span>{formatNumber(test.compressive_strength_mpa, 2)} MPa - tested {test.test_date}</span><a href={test.cube_image_url} rel="noreferrer" target="_blank">View evidence photo</a></div>) : <p className="batch-ratio">No final compression result has been recorded.</p>}
    </section>
  );
}

export default ReportTab;
