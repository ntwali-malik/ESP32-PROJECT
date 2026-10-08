import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

import { formatNumber } from "../../utils/format";
import { useBatchWorkspace } from "./BatchWorkspace";

function SpecimensTab() {
  const { batchData } = useBatchWorkspace();
  const { batch, specimens, tests } = batchData;

  // Summarise test progress per specimen so the list shows what is outstanding.
  const testsBySpecimen = tests.reduce((map, test) => {
    const list = map.get(test.cube_id) || [];
    list.push(test);
    map.set(test.cube_id, list);
    return map;
  }, new Map());

  return (
    <section className="batch-panel specimens-panel">
      <div className="section-heading">
        <div><h2>Specimens</h2><p>Open a specimen to print its QR label and record early-age or final compression tests.</p></div>
        <span className="count-badge">{specimens.length}</span>
      </div>
      <div className="specimen-list">
        {specimens.map((specimen) => {
          const specimenTests = testsBySpecimen.get(specimen.id) || [];
          const final = specimenTests.find((test) => test.test_stage === "final");
          const early = specimenTests.filter((test) => test.test_stage === "early").length;
          return (
            <Link
              className="specimen-row"
              key={specimen.id}
              state={{ fromBatch: { id: batch.id, label: batch.batch_number } }}
              to={`/cubes/${specimen.qr_token}`}
            >
              <span>
                <strong>{specimen.cube_number}</strong>
                <small>
                  {specimen.specimen_shape}
                  {early ? ` · ${early} early-age test${early === 1 ? "" : "s"}` : ""}
                  {final ? ` · final ${formatNumber(final.compressive_strength_mpa, 2)} MPa` : ""}
                </small>
              </span>
              <span className="batch-row-end"><span className={`status-pill ${specimen.status}`}>{specimen.status}</span><ChevronRight size={16} /></span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default SpecimensTab;
