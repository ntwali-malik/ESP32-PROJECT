import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Beaker, CircleAlert } from "lucide-react";

import Breadcrumbs from "../components/Breadcrumbs";
import PageHeader from "../components/PageHeader";
import { useActiveBatch } from "../context/ActiveBatchContext";
import { createBatch } from "../services/api";
import { calculateMix, SLUMP_CLASSES, SPECIMEN_PRESETS, specimenVolumeM3 } from "../utils/mix";
import { formatNumber, localDate } from "../utils/format";

function initialForm() {
  const today = localDate();
  return {
    batch_number: `BATCH-${today.replaceAll("-", "")}-01`,
    concrete_grade: "",
    casting_date: today,
    test_age_days: "28",
    cement_ratio: "1",
    sand_ratio: "2",
    aggregate_ratio: "4",
    water_cement_ratio: "0.5",
    specimen_shape: "cube",
    dimensions_mm: { ...SPECIMEN_PRESETS.cube },
    specimen_quantity: "4",
    slump_class: "S3",
  };
}

const customDimensions = [["length_mm", "Length (mm)"], ["width_mm", "Width (mm)"], ["height_mm", "Height (mm)"]];

function NewBatchPage() {
  const navigate = useNavigate();
  const { selectBatch } = useActiveBatch();
  const [form, setForm] = useState(initialForm);
  const [setupStep, setSetupStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const volume = specimenVolumeM3(form.specimen_shape, form.dimensions_mm, form.specimen_quantity);
  const mix = calculateMix(volume, {
    cement: form.cement_ratio,
    sand: form.sand_ratio,
    aggregate: form.aggregate_ratio,
  }, form.water_cement_ratio);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (setupStep === 1) {
      setSetupStep(2);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await createBatch({
        batch_number: form.batch_number,
        concrete_grade: form.concrete_grade,
        casting_date: form.casting_date,
        test_age_days: Number(form.test_age_days),
        mix_ratio: {
          cement: Number(form.cement_ratio),
          sand: Number(form.sand_ratio),
          aggregate: Number(form.aggregate_ratio),
        },
        water_cement_ratio: Number(form.water_cement_ratio),
        specimen_shape: form.specimen_shape,
        dimensions_mm: Object.fromEntries(
          Object.entries(form.dimensions_mm).map(([key, value]) => [key, Number(value)])
        ),
        specimen_quantity: Number(form.specimen_quantity),
        slump_class: form.slump_class,
      });
      selectBatch(response.data.batch);
      navigate(`/batches/${response.data.batch.id}`, { state: { created: true } });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create concrete batch.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="batch-registry-page">
      <Breadcrumbs items={[{ label: "Batches", to: "/batches" }, { label: "New batch" }]} />
      <PageHeader eyebrow="New batch" icon={Beaker} title="Prepare a concrete batch" description="Complete mix design and specimen setup. Sensor monitoring unlocks once the batch and its specimens are registered." />
      {error && <div className="cube-notice error-alert"><CircleAlert size={18} />{error}</div>}
      <div className="batch-create-layout">
        <form className="cube-form batch-create-form" onSubmit={handleSubmit}>
          <ol aria-label="Batch setup steps" className="setup-stepper">
            <li aria-current={setupStep === 1 ? "step" : undefined} className={setupStep > 1 ? "complete" : ""}><span>01</span><div><strong>Mix design</strong><small>Ratio and water-cement</small></div></li>
            <li aria-current={setupStep === 2 ? "step" : undefined}><span>02</span><div><strong>Specimens</strong><small>Shape and quantity</small></div></li>
          </ol>
          {setupStep === 1 ? (
            <>
              <div className="form-title"><Beaker size={18} /><h3>01 / Define the mix</h3></div>
              <div className="form-row">
                <label>Batch number<input required value={form.batch_number} onChange={(event) => updateField("batch_number", event.target.value)} /></label>
                <label>Concrete grade<input required placeholder="C25/30" value={form.concrete_grade} onChange={(event) => updateField("concrete_grade", event.target.value)} /></label>
              </div>
              <div className="form-row">
                <label>Casting date<input required type="date" value={form.casting_date} onChange={(event) => updateField("casting_date", event.target.value)} /></label>
                <label>Final test age (days)<input min="1" required type="number" value={form.test_age_days} onChange={(event) => updateField("test_age_days", event.target.value)} /></label>
              </div>
              <fieldset className="mix-ratio-fieldset"><legend>Mix ratio - cement : sand : aggregate</legend>
                <div className="form-row">{[["cement_ratio", "Cement"], ["sand_ratio", "Sand"], ["aggregate_ratio", "Aggregate"]].map(([field, label]) => <label key={field}>{label}<input min="0.01" required step="0.01" type="number" value={form[field]} onChange={(event) => updateField(field, event.target.value)} /></label>)}</div>
                <label className="wc-field">Water-cement ratio<input min="0.01" required step="0.01" type="number" value={form.water_cement_ratio} onChange={(event) => updateField("water_cement_ratio", event.target.value)} /></label>
              </fieldset>
              <div className="setup-actions">
                <Link className="secondary-button" to="/batches">Cancel</Link>
                <button className="primary-button" type="submit">Continue to specimen setup</button>
              </div>
            </>
          ) : (
            <>
              <div className="form-title"><Beaker size={18} /><h3>02 / Set specimen geometry</h3></div>
              <p className="batch-ratio">Mix: {form.cement_ratio}:{form.sand_ratio}:{form.aggregate_ratio}, w/c {form.water_cement_ratio}</p>
              <div className="form-row">
                <label>Specimen shape<select value={form.specimen_shape} onChange={(event) => setForm((current) => ({ ...current, specimen_shape: event.target.value, dimensions_mm: { ...SPECIMEN_PRESETS[event.target.value] } }))}><option value="cube">Cube - 150 mm</option><option value="cylinder">Cylinder - 150 x 300 mm</option><option value="beam">Beam - 500 x 100 x 100 mm</option><option value="custom">Custom dimensions</option></select></label>
                <label>Quantity<input min="1" max="100" required type="number" value={form.specimen_quantity} onChange={(event) => updateField("specimen_quantity", event.target.value)} /></label>
              </div>
              {form.specimen_shape === "custom" ? <div className="form-row">{customDimensions.map(([key, label]) => <label key={key}>{label}<input min="1" required type="number" value={form.dimensions_mm[key] ?? ""} onChange={(event) => setForm((current) => ({ ...current, dimensions_mm: { ...current.dimensions_mm, [key]: event.target.value } }))} /></label>)}</div> : <p className="dimension-note">Standard dimensions: {Object.entries(form.dimensions_mm).map(([key, value]) => `${key.replace("_mm", "")} ${value} mm`).join(" x ")}</p>}
              <label>BS8500 slump class<select value={form.slump_class} onChange={(event) => updateField("slump_class", event.target.value)}>{Object.entries(SLUMP_CLASSES).map(([key, range]) => <option key={key} value={key}>{key} - {range.description}</option>)}</select></label>
              <div className="setup-actions">
                <button className="secondary-button" onClick={() => setSetupStep(1)} type="button">Back to mix design</button>
                <button className="primary-button" disabled={saving} type="submit"><Beaker size={16} />{saving ? "Registering..." : "Register batch and unlock sensors"}</button>
              </div>
            </>
          )}
        </form>

        <aside className="batch-calculation-panel">
          <div className="calculation-step-label">{setupStep === 1 ? "NEXT / 02" : "CALCULATION / LIVE"}</div>
          <div className="form-title"><Activity size={18} /><h3>{setupStep === 1 ? "Choose specimen geometry next" : "Material estimate"}</h3></div>
          {setupStep === 1 ? (
            <p className="calculation-prompt">Select the specimen shape and quantity in Step 2. The total wet volume and material weights will calculate from those choices.</p>
          ) : (
            <>
              <p>{form.specimen_quantity || 0} specimens - {formatNumber(volume, 6)} m3 wet volume</p>
              <dl className="quantity-list">
                <div><dt>Dry volume</dt><dd>{formatNumber(mix.dryVolumeM3, 6)} m3</dd></div>
                <div><dt>Cement</dt><dd>{formatNumber(mix.cementKg)} kg</dd></div>
                <div><dt>Water</dt><dd>{formatNumber(mix.waterLiters)} L</dd></div>
                <div><dt>Sand</dt><dd>{formatNumber(mix.sandKg)} kg</dd></div>
                <div><dt>Aggregate</dt><dd>{formatNumber(mix.aggregateKg)} kg</dd></div>
              </dl>
            </>
          )}
          <p className="projection-note">Fixed density defaults: cement 1440, sand 1600, aggregate 1500 kg/m3. Dry-volume factor: 1.54.</p>
        </aside>
      </div>
    </div>
  );
}

export default NewBatchPage;
