import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Radio, Square } from "lucide-react";

import { getLatestReading, sendRecordingEvent } from "../services/api";
import { formatNumber } from "../utils/format";
import { slumpFromDistanceCm } from "../utils/mix";

const POLL_MS = 1500;

async function fetchLatest() {
  try {
    const response = await getLatestReading();
    return response?.data || null;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
}

// Captures the slump from the ultrasonic sensor: the last reading received
// between Start and Stop is handed to onCaptured as the slump in mm.
function UltrasonicSlumpCapture({ disabled, onCaptured }) {
  const [capturing, setCapturing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [liveReading, setLiveReading] = useState(null);
  const baselineIdRef = useRef(null);
  const capturedRef = useRef(null);
  const capturingRef = useRef(false);

  // Track readings that arrive after Start; anything older belongs to a previous session.
  const pollLatest = useCallback(async () => {
    const reading = await fetchLatest();
    if (reading && reading.id !== baselineIdRef.current) {
      capturedRef.current = reading;
      setLiveReading(reading);
    }
    return reading;
  }, []);

  useEffect(() => {
    if (!capturing) return undefined;
    const timer = window.setInterval(() => {
      pollLatest().catch(() => {});
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [capturing, pollLatest]);

  // Never leave the sensor recording if the operator navigates away mid-capture.
  useEffect(() => () => {
    if (capturingRef.current) sendRecordingEvent("stop").catch(() => {});
  }, []);

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const before = await fetchLatest();
      baselineIdRef.current = before?.id ?? null;
      capturedRef.current = null;
      setLiveReading(null);
      await sendRecordingEvent("start");
      capturingRef.current = true;
      setCapturing(true);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to start the ultrasonic capture.");
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    setBusy(true);
    setError("");
    try {
      // Pick up a reading that may have landed since the last poll, then stop recording.
      await pollLatest().catch(() => {});
      await sendRecordingEvent("stop");
      capturingRef.current = false;
      setCapturing(false);

      const reading = capturedRef.current;
      const slump = slumpFromDistanceCm(reading?.distance_cm);
      if (slump === null) {
        setError("No ultrasonic reading was received during the capture. Check the sensor and try again.");
        return;
      }
      onCaptured(slump, reading);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to stop the ultrasonic capture.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`ultrasonic-capture ${capturing ? "active" : ""}`}>
      <div className="ultrasonic-capture-info">
        <Radio size={16} />
        <div>
          <strong>Ultrasonic slump capture</strong>
          <small>
            {capturing
              ? liveReading
                ? `Live: ${formatNumber(liveReading.distance_cm, 2)} cm (${formatNumber(slumpFromDistanceCm(liveReading.distance_cm), 1)} mm)`
                : "Waiting for the first sensor reading..."
              : "Start, let the concrete settle, then stop to fill in the slump."}
          </small>
        </div>
      </div>
      <button
        className={capturing ? "secondary-button" : "primary-button"}
        disabled={busy || (!capturing && disabled)}
        onClick={capturing ? stop : start}
        type="button"
      >
        {capturing ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        {busy ? (capturing ? "Stopping..." : "Starting...") : capturing ? "Stop capture" : "Start capture"}
      </button>
      {error && <p className="ultrasonic-capture-error" role="alert">{error}</p>}
    </div>
  );
}

export default UltrasonicSlumpCapture;
