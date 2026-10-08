import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getBatch } from "../services/api";

const STORAGE_KEY = "qc_active_batch_id";

const ActiveBatchContext = createContext(null);

function readStoredId() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    return null;
  }
}

function writeStoredId(id) {
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, String(id));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    // Storage can be unavailable (private mode); selection still works in memory.
  }
}

export function ActiveBatchProvider({ children }) {
  const [batchId, setBatchId] = useState(readStoredId);
  const [batch, setBatch] = useState(null);

  // Keep tabs in sync when another window switches batch.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) setBatchId(event.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Load a summary for the sidebar and breadcrumbs when only the id is known.
  useEffect(() => {
    if (!batchId || (batch && String(batch.id) === String(batchId))) return undefined;
    let cancelled = false;
    Promise.resolve()
      .then(() => getBatch(batchId))
      .then((response) => {
        if (!cancelled && response?.data?.batch) setBatch(response.data.batch);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [batch, batchId]);

  const selectBatch = useCallback((value) => {
    const isObject = value && typeof value === "object";
    const id = isObject ? value.id : value;
    writeStoredId(id);
    setBatchId(id == null ? null : String(id));
    setBatch(isObject ? value : null);
  }, []);

  const clearBatch = useCallback(() => {
    writeStoredId(null);
    setBatchId(null);
    setBatch(null);
  }, []);

  const value = useMemo(() => ({
    batchId,
    batch: batch && String(batch.id) === String(batchId) ? batch : null,
    selectBatch,
    clearBatch,
  }), [batch, batchId, clearBatch, selectBatch]);

  return <ActiveBatchContext.Provider value={value}>{children}</ActiveBatchContext.Provider>;
}

export function useActiveBatch() {
  const context = useContext(ActiveBatchContext);
  if (!context) throw new Error("useActiveBatch must be used inside ActiveBatchProvider");
  return context;
}
