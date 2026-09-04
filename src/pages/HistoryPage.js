import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, RefreshCw } from "lucide-react";

import AlertBanner from "../components/AlertBanner";
import PageHeader from "../components/PageHeader";
import SensorTable from "../components/SensorTable";
import useSensorData from "../hooks/useSensorData";

const PAGE_SIZES = [10, 25, 50];

function startOfDay(value) {
  return new Date(`${value}T00:00:00`);
}

function endOfDay(value) {
  return new Date(`${value}T23:59:59.999`);
}

function HistoryPage() {
  const { readings, loading, error, reload } = useSensorData(0);
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return readings.filter((reading) => {
      const recorded = new Date(reading.recorded_at);

      if (fromDate && recorded < startOfDay(fromDate)) return false;
      if (toDate && recorded > endOfDay(toDate)) return false;

      if (!term) return true;

      const stamp = recorded.toLocaleString().toLowerCase();
      return (
        stamp.includes(term) ||
        String(reading.temperature_c).includes(term) ||
        String(reading.distance_cm).includes(term)
      );
    });
  }, [fromDate, query, readings, toDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paged = filtered.slice(startIndex, startIndex + pageSize);
  const hasFilters = Boolean(query || fromDate || toDate);
  const rangeStart = filtered.length === 0 ? 0 : startIndex + 1;
  const rangeEnd = startIndex + paged.length;

  useEffect(() => {
    setPage(1);
  }, [fromDate, pageSize, query, toDate]);

  const clearFilters = () => {
    setQuery("");
    setFromDate("");
    setToDate("");
  };

  return (
    <>
      <PageHeader
        eyebrow="Archive"
        icon={Clock}
        title="Sensor readings"
        description="Filter by date range, then page through the stored ESP32 samples."
        actions={
          <button className="refresh-button" disabled={loading} onClick={reload} type="button">
            <RefreshCw className={loading ? "spin" : ""} size={16} />
            Refresh
          </button>
        }
      />

      {error && (
        <AlertBanner title="Connection problem" type="error">
          {error}
        </AlertBanner>
      )}

      <div className="toolbar readings-toolbar">
        <label className="search-field">
          From
          <input
            max={toDate || undefined}
            onChange={(event) => setFromDate(event.target.value)}
            type="date"
            value={fromDate}
          />
        </label>
        <label className="search-field">
          To
          <input
            min={fromDate || undefined}
            onChange={(event) => setToDate(event.target.value)}
            type="date"
            value={toDate}
          />
        </label>
        <label className="search-field">
          Search
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Temperature or distance"
            type="search"
            value={query}
          />
        </label>
        <div className="toolbar-meta">
          <span className="count-badge">{filtered.length} records</span>
          {hasFilters && (
            <button className="secondary-button" onClick={clearFilters} type="button">
              Clear filters
            </button>
          )}
        </div>
      </div>

      <SensorTable
        description={
          hasFilters
            ? `Showing ${rangeStart}–${rangeEnd} of ${filtered.length} matching readings`
            : `Showing ${rangeStart}–${rangeEnd} of ${filtered.length} readings`
        }
        emptyMessage={
          hasFilters
            ? "No readings match this date range or search."
            : "No sensor readings available."
        }
        readings={paged}
        startIndex={startIndex}
        title="Reading history"
      />

      <div className="pagination">
        <label className="page-size">
          Rows
          <select
            onChange={(event) => setPageSize(Number(event.target.value))}
            value={pageSize}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="pagination-controls">
          <button
            className="secondary-button"
            disabled={currentPage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span className="page-status">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="secondary-button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            type="button"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </>
  );
}

export default HistoryPage;
