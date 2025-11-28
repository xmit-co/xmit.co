import { JSX } from "preact";
import { route } from "preact-router";
import { Link } from "preact-router/match";
import { useContext, useEffect, useRef, useState } from "preact/hooks";
import {
  loadSession,
  loadSite,
  loadTeam,
  loadUser,
  logError,
  StateCtx,
} from "./app.tsx";
import { Footer } from "./footer.tsx";
import { Header } from "./header.tsx";
import { Site } from "./models.tsx";
import { decoder, encoder } from "./utils.ts";

function Tappable({
  tip,
  children,
  ...props
}: {
  tip: string;
  children: JSX.Element;
} & JSX.HTMLAttributes<HTMLDivElement>) {
  const [show, setShow] = useState(false);
  return (
    <div
      {...props}
      data-tappable
      title={tip}
      onTouchStart={() => setShow(true)}
      onTouchEnd={() => setTimeout(() => setShow(false), 2000)}
    >
      {children}
      {show && <div class="touch-tooltip">{tip}</div>}
    </div>
  );
}

interface AnalyticsFilter {
  column: string;
  in?: string[];
  notIn?: string[];
}

interface AnalyticsRequest {
  siteID: number;
  start: Date;
  end: Date;
  granularity: string;
  filters: AnalyticsFilter[];
  groupBy: string[];
  limit: number;
}

interface AnalyticsBucket {
  time: Date;
  groups: any[];
  count: number;
}

interface AnalyticsResponse {
  groupKeys: string[];
  buckets: AnalyticsBucket[];
}

// Defaults
const DEFAULT_TIME_RANGE = "7d";
const DEFAULT_GRANULARITY = "day";
const DEFAULT_LIMIT = 10000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CHART_HEIGHT_EM = 30;

const FILTER_COLUMNS = [
  { value: "domain", label: "Domain" },
  { value: "path", label: "Path" },
  { value: "type", label: "Client Type" },
  { value: "referer", label: "Referrer" },
  { value: "status", label: "HTTP Status" },
  { value: "content_type", label: "Content Type" },
];

const GRANULARITIES = [
  { value: "none", label: "None (totals only)" },
  { value: "hour", label: "Hourly" },
  { value: "day", label: "Daily" },
  { value: "month", label: "Monthly" },
];

const TIME_RANGES = [
  { value: "1d", label: "Last 24 hours", days: 1 },
  { value: "3d", label: "Last 3 days", days: 3 },
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "custom", label: "Custom", days: 0 },
];

function getQueryParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

function buildQueryString(params: Record<string, string | null>): string {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== "") {
      p.set(key, value);
    }
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

function encodeFilters(filters: AnalyticsFilter[]): string {
  if (filters.length === 0) return "";
  return JSON.stringify(filters);
}

function decodeFilters(str: string): AnalyticsFilter[] {
  if (!str) return [];
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}

function encodeRequest(req: AnalyticsRequest): Uint8Array {
  const filters = req.filters.map((f) => {
    const m = new Map<number, any>();
    m.set(1, f.column);
    if (f.in && f.in.length > 0) m.set(2, f.in);
    if (f.notIn && f.notIn.length > 0) m.set(3, f.notIn);
    return m;
  });

  const m = new Map<number, any>();
  m.set(1, req.siteID);
  m.set(2, req.start);
  m.set(3, req.end);
  if (req.granularity && req.granularity !== "none") m.set(4, req.granularity);
  if (filters.length > 0) m.set(5, filters);
  if (req.groupBy.length > 0) m.set(6, req.groupBy);
  if (req.limit > 0) m.set(7, req.limit);

  return encoder.encode(m);
}

function decodeResponse(data: Uint8Array): AnalyticsResponse {
  const m = decoder.decode(data) as Map<number, any>;
  const groupKeys = m.get(1) || [];
  const rawBuckets = m.get(2) || [];

  const buckets: AnalyticsBucket[] = rawBuckets.map((b: Map<number, any>) => {
    const rawTime = b.get(1);
    const time = rawTime instanceof Date ? rawTime : new Date(rawTime * 1000);
    return {
      time,
      groups: b.get(2) || [],
      count: b.get(3) || 0,
    };
  });

  return { groupKeys, buckets };
}

async function fetchAnalytics(
  req: AnalyticsRequest,
  signal?: AbortSignal,
): Promise<AnalyticsResponse> {
  const response = await fetch("/api/web/analytics", {
    method: "POST",
    body: encodeRequest(req),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Analytics request failed: ${text}`);
  }

  const data = new Uint8Array(await response.arrayBuffer());
  return decodeResponse(data);
}

interface FilterRowProps {
  filter: AnalyticsFilter;
  onChange: (filter: AnalyticsFilter) => void;
  onRemove: () => void;
  siteID: number;
  timeRange: { start: Date; end: Date };
  otherFilters: AnalyticsFilter[];
}

function FilterRow({
  filter,
  onChange,
  onRemove,
  siteID,
  timeRange,
  otherFilters,
}: FilterRowProps) {
  const [inputValue, setInputValue] = useState("");
  const [excludeMode, setExcludeMode] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const listId = `filter-${filter.column}-suggestions`;

  const fetchSuggestions = async () => {
    if (suggestions.length > 0) return;
    try {
      const validFilters = otherFilters.filter(
        (f) =>
          f.column &&
          ((f.in && f.in.length > 0) || (f.notIn && f.notIn.length > 0)),
      );
      const result = await fetchAnalytics({
        siteID,
        start: timeRange.start,
        end: timeRange.end,
        granularity: "none",
        filters: validFilters,
        groupBy: [filter.column],
        limit: 100,
      });
      setSuggestions(
        result.buckets.map((b) => b.groups[0] || "").filter((v) => v !== ""),
      );
    } catch {
      // Ignore errors
    }
  };

  const isExclude = excludeMode || (filter.notIn && filter.notIn.length > 0);
  const values = filter.in || filter.notIn || [];

  const addValue = () => {
    if (!inputValue.trim()) return;
    const newValues = [...values, inputValue.trim()];
    if (isExclude) {
      onChange({ ...filter, notIn: newValues, in: undefined });
    } else {
      onChange({ ...filter, in: newValues, notIn: undefined });
    }
    setInputValue("");
  };

  const removeValue = (idx: number) => {
    const newValues = values.filter((_, i) => i !== idx);
    if (isExclude) {
      onChange({
        ...filter,
        notIn: newValues.length > 0 ? newValues : undefined,
        in: undefined,
      });
    } else {
      onChange({
        ...filter,
        in: newValues.length > 0 ? newValues : undefined,
        notIn: undefined,
      });
    }
  };

  const toggleMode = () => {
    const newExclude = !isExclude;
    setExcludeMode(newExclude);
    if (values.length > 0) {
      if (newExclude) {
        onChange({ ...filter, notIn: values, in: undefined });
      } else {
        onChange({ ...filter, in: values, notIn: undefined });
      }
    }
  };

  return (
    <div class="filter-row">
      <select
        value={filter.column}
        onChange={(e) =>
          onChange({ ...filter, column: (e.target as HTMLSelectElement).value })
        }
      >
        {FILTER_COLUMNS.map((col) => (
          <option key={col.value} value={col.value}>
            {col.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        class={isExclude ? "filter-mode exclude" : "filter-mode include"}
        onClick={toggleMode}
      >
        {isExclude ? "excludes" : "includes"}
      </button>
      <div class="filter-values">
        {values.map((v, idx) => (
          <span key={idx} class="filter-tag">
            {v === "" ? <em>empty</em> : v}
            <button
              type="button"
              class="tag-remove"
              onClick={() => removeValue(idx)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          placeholder="Add value…"
          list={listId}
          onFocus={fetchSuggestions}
          onInput={(e) => setInputValue((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addValue();
            } else if (e.key === "Backspace" && !inputValue) {
              if (values.length > 0) {
                removeValue(values.length - 1);
              } else {
                onRemove();
              }
            }
          }}
        />
        <datalist id={listId}>
          {suggestions
            .filter((s) => !values.includes(s))
            .map((s) => (
              <option key={s} value={s} />
            ))}
        </datalist>
        {!values.includes("") && (
          <button
            type="button"
            class="add-empty"
            onClick={() => {
              const newValues = [...values, ""];
              if (isExclude) {
                onChange({ ...filter, notIn: newValues, in: undefined });
              } else {
                onChange({ ...filter, in: newValues, notIn: undefined });
              }
            }}
          >
            + empty
          </button>
        )}
      </div>
      <button type="button" class="delete" onClick={onRemove}>
        ×
      </button>
    </div>
  );
}

const GROUP_COLORS = [
  "#0f0",
  "#0af",
  "#f0f",
  "#fa0",
  "#f55",
  "#5ff",
  "#ff5",
  "#a5f",
];

function formatDateISO(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function formatTimeLabel(date: Date, granularity: string): string {
  if (granularity === "hour") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (granularity === "day") {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } else {
    return date.toLocaleDateString([], { month: "short", year: "2-digit" });
  }
}

function formatGroupLabel(groups: any[]): string {
  return groups.length > 0
    ? groups.map((g) => g || "empty").join(", ")
    : "empty";
}

interface AnalyticsChartProps {
  data: AnalyticsResponse;
  granularity: string;
  stacked: boolean;
  setStacked: (stacked: boolean) => void;
}

function AnalyticsChart({
  data,
  granularity,
  stacked,
  setStacked,
}: AnalyticsChartProps) {
  if (data.buckets.length === 0) {
    return null;
  }

  if (granularity === "none") {
    const hasGroups = data.groupKeys.length > 0;
    const canStack = data.groupKeys.length > 1;

    if (stacked && canStack) {
      const rowMap = new Map<string, Map<string, number>>();
      const allSegments = new Set<string>();

      for (const bucket of data.buckets) {
        const rowKey =
          bucket.groups
            .slice(0, -1)
            .map((g) => g || "empty")
            .join(", ") || "empty";
        const segmentKey = bucket.groups[bucket.groups.length - 1] || "empty";
        allSegments.add(segmentKey);

        if (!rowMap.has(rowKey)) {
          rowMap.set(rowKey, new Map());
        }
        rowMap.get(rowKey)!.set(segmentKey, bucket.count);
      }

      const segments = Array.from(allSegments);
      const segmentColors = new Map(
        segments.map((s, i) => [s, GROUP_COLORS[i % GROUP_COLORS.length]]),
      );

      const rows = Array.from(rowMap.keys()).sort((a, b) => {
        const totalA = Array.from(rowMap.get(a)!.values()).reduce(
          (sum, c) => sum + c,
          0,
        );
        const totalB = Array.from(rowMap.get(b)!.values()).reduce(
          (sum, c) => sum + c,
          0,
        );
        return totalB - totalA;
      });

      let maxTotal = 1;
      for (const counts of rowMap.values()) {
        let total = 0;
        for (const count of counts.values()) {
          total += count;
        }
        maxTotal = Math.max(maxTotal, total);
      }

      const countWidth = `${maxTotal.toLocaleString().length}ch`;

      return (
        <>
          <label class="stack-toggle">
            <input
              type="checkbox"
              checked={stacked}
              onChange={(e) =>
                setStacked((e.target as HTMLInputElement).checked)
              }
            />{" "}
            Stack by {data.groupKeys[data.groupKeys.length - 1]}
          </label>
          <div class="hbar-chart">
            {rows.map((rowKey) => {
              const counts = rowMap.get(rowKey)!;
              let total = 0;
              for (const c of counts.values()) total += c;

              return (
                <div key={rowKey} class="hbar-row">
                  <span class="hbar-label" title={rowKey}>
                    {rowKey}
                  </span>
                  <div class="hbar-track">
                    {segments.map((seg) => {
                      const count = counts.get(seg) || 0;
                      const width = (count / maxTotal) * 100;
                      return (
                        <Tappable
                          key={seg}
                          class="hbar-fill"
                          style={{
                            width: `${width}%`,
                            backgroundColor: segmentColors.get(seg),
                          }}
                          tip={`${seg}: ${count.toLocaleString()}`}
                        >
                          <></>
                        </Tappable>
                      );
                    })}
                  </div>
                  <span class="hbar-count" style={{ width: countWidth }}>
                    {total.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
          <div class="chart-legend">
            {segments.map((seg) => (
              <span key={seg} class="legend-item">
                <span
                  class="legend-color"
                  style={{ backgroundColor: segmentColors.get(seg) }}
                />
                {seg}
              </span>
            ))}
          </div>
        </>
      );
    }

    const maxCount = Math.max(...data.buckets.map((b) => b.count), 1);
    const countWidth = `${maxCount.toLocaleString().length}ch`;

    return (
      <>
        {canStack && (
          <label class="stack-toggle">
            <input
              type="checkbox"
              checked={stacked}
              onChange={(e) =>
                setStacked((e.target as HTMLInputElement).checked)
              }
            />{" "}
            Stack by {data.groupKeys[data.groupKeys.length - 1]}
          </label>
        )}
        <div class="hbar-chart">
          {data.buckets.map((bucket, idx) => {
            const width = (bucket.count / maxCount) * 100;
            const label = hasGroups ? formatGroupLabel(bucket.groups) : "Total";
            return (
              <div key={idx} class="hbar-row">
                <span class="hbar-label" title={label}>
                  {label}
                </span>
                <div class="hbar-track">
                  <Tappable
                    class="hbar-fill"
                    style={{ width: `${width}%` }}
                    tip={`${bucket.count.toLocaleString()} requests`}
                  >
                    <></>
                  </Tappable>
                </div>
                <span class="hbar-count" style={{ width: countWidth }}>
                  {bucket.count.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  const hasGroups = data.groupKeys.length > 0;

  if (!hasGroups) {
    const maxCount = Math.max(...data.buckets.map((b) => b.count), 1);
    return (
      <div class="analytics-chart">
        <div class="chart-container">
          <div class="chart-bars">
            {data.buckets.map((bucket, idx) => {
              const height = `${(bucket.count / maxCount) * CHART_HEIGHT_EM}em`;
              const label = formatTimeLabel(new Date(bucket.time), granularity);
              return (
                <Tappable
                  key={idx}
                  class="chart-bar-wrapper"
                  tip={`${label}: ${bucket.count.toLocaleString()} requests`}
                >
                  <>
                    <div class="chart-bar" style={{ height }} />
                    <span class="chart-label">{label}</span>
                  </>
                </Tappable>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const timeMap = new Map<string, Map<string, number>>();
  const allGroups = new Set<string>();

  for (const bucket of data.buckets) {
    const timeKey = new Date(bucket.time).toISOString();
    const groupKey = JSON.stringify(bucket.groups);
    allGroups.add(groupKey);

    if (!timeMap.has(timeKey)) {
      timeMap.set(timeKey, new Map());
    }
    timeMap.get(timeKey)!.set(groupKey, bucket.count);
  }

  const times = Array.from(timeMap.keys()).sort();
  const groups = Array.from(allGroups);
  const groupColors = new Map(
    groups.map((g, i) => [g, GROUP_COLORS[i % GROUP_COLORS.length]]),
  );

  let maxTotal = 1;
  for (const counts of timeMap.values()) {
    let total = 0;
    for (const count of counts.values()) {
      total += count;
    }
    maxTotal = Math.max(maxTotal, total);
  }

  return (
    <div class="analytics-chart">
      <div class="chart-container">
        <div class="chart-bars">
          {times.map((timeKey, idx) => {
            const counts = timeMap.get(timeKey)!;
            const date = new Date(timeKey);
            const label = formatTimeLabel(date, granularity);

            return (
              <div key={idx} class="chart-bar-wrapper">
                <div class="chart-bar-stack" style={{ height: `${CHART_HEIGHT_EM}em` }}>
                  {groups.map((g) => {
                    const count = counts.get(g) || 0;
                    const height = `${(count / maxTotal) * CHART_HEIGHT_EM}em`;
                    return (
                      <Tappable
                        key={g}
                        class="chart-bar-segment"
                        style={{
                          height,
                          backgroundColor: groupColors.get(g),
                        }}
                        tip={`${label}\n${formatGroupLabel(JSON.parse(g))}: ${count.toLocaleString()}`}
                      >
                        <></>
                      </Tappable>
                    );
                  })}
                </div>
                <span class="chart-label">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div class="chart-legend">
        {groups.map((g) => (
          <span key={g} class="legend-item">
            <span
              class="legend-color"
              style={{ backgroundColor: groupColors.get(g) }}
            />
            {formatGroupLabel(JSON.parse(g))}
          </span>
        ))}
      </div>
    </div>
  );
}

function downloadCSV(data: AnalyticsResponse, granularity: string) {
  const hasTime = granularity !== "none";
  const headers = [...(hasTime ? ["Time"] : []), ...data.groupKeys, "Requests"];
  const rows = data.buckets.map((b) => [
    ...(hasTime ? [formatDateISO(new Date(b.time))] : []),
    ...b.groups.map((g) => g || ""),
    String(b.count),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "analytics.csv";
  a.click();
  URL.revokeObjectURL(url);
}

interface AnalyticsTableProps {
  data: AnalyticsResponse;
  granularity: string;
}

function AnalyticsTable({ data, granularity }: AnalyticsTableProps) {
  if (data.buckets.length === 0) {
    return (
      <p>
        <em>No data for the selected time range and filters.</em>
      </p>
    );
  }

  const hasTime = granularity !== "none";
  const tableData = data.buckets.map((b) => ({
    time: b.time,
    groups: b.groups,
    count: b.count,
  }));

  return (
    <div class="analytics-table">
      <table>
        <thead>
          <tr>
            {hasTime && <th>Time</th>}
            {data.groupKeys.map((key) => (
              <th key={key}>{key}</th>
            ))}
            <th>Requests</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, idx) => (
            <tr key={idx}>
              {hasTime && row.time && (
                <td>{formatDateISO(new Date(row.time))}</td>
              )}
              {row.groups.map((g, gidx) => (
                <td key={gidx} title={g || ""}>
                  {g || <em>empty</em>}
                </td>
              ))}
              <td class="count">{row.count.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AnalyticsBody({ site, allSites }: { site: Site; allSites: Site[] }) {
  const state = useContext(StateCtx).value;
  const siteID = site.id ?? 0;
  const teamID = site.teamID || 0;
  const team = loadTeam(state, teamID);

  const params = getQueryParams();
  const initialTimeRange = params.get("range") || DEFAULT_TIME_RANGE;
  const initialGranularity = params.get("granularity") || DEFAULT_GRANULARITY;
  const initialGroupBy =
    params.get("groupBy")?.split(",").filter(Boolean) || [];
  const initialFilters = decodeFilters(params.get("filters") || "");
  const initialLimit = Number(params.get("limit")) || DEFAULT_LIMIT;
  const initialStart = params.get("start") || "";
  const initialEnd = params.get("end") || "";
  const initialStacked = params.get("stacked") === "1";

  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [granularity, setGranularity] = useState(initialGranularity);
  const [groupBy, setGroupBy] = useState<string[]>(initialGroupBy);
  const [filters, setFilters] = useState<AnalyticsFilter[]>(initialFilters);
  const [limit, setLimit] = useState(initialLimit);
  const [customStart, setCustomStart] = useState(initialStart);
  const [customEnd, setCustomEnd] = useState(initialEnd);
  const [stacked, setStacked] = useState(initialStacked);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const updateUrl = (newSiteID?: number) => {
    const query = buildQueryString({
      range: timeRange !== DEFAULT_TIME_RANGE ? timeRange : null,
      granularity: granularity !== DEFAULT_GRANULARITY ? granularity : null,
      groupBy: groupBy.length > 0 ? groupBy.join(",") : null,
      filters: encodeFilters(filters) || null,
      limit: limit !== DEFAULT_LIMIT ? String(limit) : null,
      start: timeRange === "custom" && customStart ? customStart : null,
      end: timeRange === "custom" && customEnd ? customEnd : null,
      stacked: stacked ? "1" : null,
    });
    const targetSiteID = newSiteID ?? siteID;
    window.history.replaceState(
      null,
      "",
      `/analytics/site/${targetSiteID}${query}`,
    );
  };

  useEffect(() => {
    updateUrl();
  }, [
    timeRange,
    granularity,
    groupBy,
    filters,
    limit,
    customStart,
    customEnd,
    stacked,
  ]);

  const getTimeRange = () => {
    let start: Date;
    let end: Date;
    if (timeRange === "custom" && customStart && customEnd) {
      start = new Date(customStart);
      end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
    } else {
      const range =
        TIME_RANGES.find((r) => r.value === timeRange) || TIME_RANGES[1];
      end = new Date();
      start = new Date(end.getTime() - range.days * MS_PER_DAY);
    }
    return { start, end };
  };

  const hourlyLimitExceeded = (() => {
    if (granularity !== "hour") return false;
    const { start, end } = getTimeRange();
    const daysDiff = (end.getTime() - start.getTime()) / MS_PER_DAY;
    return daysDiff > 3;
  })();

  const runQuery = async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    const { start, end } = getTimeRange();
    const daysDiff = (end.getTime() - start.getTime()) / MS_PER_DAY;
    let effectiveGranularity = granularity;
    if (granularity === "hour" && daysDiff > 3) {
      effectiveGranularity = "day";
    }

    const validFilters = filters.filter(
      (f) =>
        f.column &&
        ((f.in && f.in.length > 0) || (f.notIn && f.notIn.length > 0)),
    );

    try {
      const result = await fetchAnalytics(
        {
          siteID,
          start,
          end,
          granularity: effectiveGranularity,
          filters: validFilters,
          groupBy,
          limit,
        },
        controller.signal,
      );
      setData(result);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return; // Cancelled, don't update state
      }
      logError(err instanceof Error ? err.message : String(err));
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    runQuery();
  }, []);

  const addFilter = () => {
    setFilters([...filters, { column: "path", in: [] }]);
  };

  const updateFilter = (idx: number, filter: AnalyticsFilter) => {
    const newFilters = [...filters];
    newFilters[idx] = filter;
    setFilters(newFilters);
  };

  const removeFilter = (idx: number) => {
    setFilters(filters.filter((_, i) => i !== idx));
  };

  const changeSite = (newSiteID: number) => {
    updateUrl(newSiteID);
    route(`/analytics/site/${newSiteID}${window.location.search}`);
  };

  return (
    <>
      <div class="breadcrumb">
        <Link href="/admin">← Admin</Link>
        <span> / </span>
        <Link href={`/admin/team/${teamID}`}>
          Team #{teamID}: {team?.name || <em>unnamed</em>}
        </Link>
        <span> / </span>
        <Link href={`/admin/site/${siteID}`}>
          Site #{siteID}: {site.name || <em>unnamed</em>}
        </Link>
      </div>

      <h1>
        <span class="icon">📊</span>Analytics for{" "}
        <select
          value={siteID}
          onChange={(e) =>
            changeSite(Number((e.target as HTMLSelectElement).value))
          }
        >
          {allSites.map((s) => (
            <option key={s.id ?? 0} value={s.id ?? 0}>
              #{s.id ?? 0}: {s.name || "unnamed"}
            </option>
          ))}
        </select>
      </h1>

      <section>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runQuery();
          }}
        >
          <h2>
            <span class="icon">🔍</span>Query
            {loading && <span class="spinner query-spinner">⟳</span>}
          </h2>
          <div class="query-row">
            <span class="query-label">Range:</span>
            <select
              value={timeRange}
              onChange={(e) => {
                const value = (e.target as HTMLSelectElement).value;
                if (value === "custom" && !customStart && !customEnd) {
                  const today = new Date().toISOString().split("T")[0];
                  setCustomStart(today);
                  setCustomEnd(today);
                }
                setTimeRange(value);
              }}
            >
              {TIME_RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {timeRange === "custom" && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) =>
                    setCustomStart((e.target as HTMLInputElement).value)
                  }
                />
                <span>to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) =>
                    setCustomEnd((e.target as HTMLInputElement).value)
                  }
                />
              </>
            )}
          </div>
          <div class="query-row">
            <span class="query-label">Granularity:</span>
            <select
              value={granularity}
              onChange={(e) =>
                setGranularity((e.target as HTMLSelectElement).value)
              }
            >
              {GRANULARITIES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
            {hourlyLimitExceeded && (
              <span class="limit-warning">Limited to 3 days</span>
            )}
          </div>
          <div class="query-row">
            <span class="query-label">Limit:</span>
            <input
              type="number"
              value={limit}
              min={1}
              max={10000}
              class="limit-input"
              onInput={(e) =>
                setLimit(Number((e.target as HTMLInputElement).value) || 100)
              }
            />
          </div>
          <div class="query-row query-row-top">
            <span class="query-label">Filters:</span>
            <div class="filters-container">
              {filters.length === 0 ? (
                <em>None</em>
              ) : (
                <div class="filters-list">
                  {filters.map((filter, idx) => (
                    <FilterRow
                      key={`${siteID}-${idx}`}
                      filter={filter}
                      onChange={(f) => updateFilter(idx, f)}
                      onRemove={() => removeFilter(idx)}
                      siteID={siteID}
                      timeRange={getTimeRange()}
                      otherFilters={filters.filter((_, i) => i !== idx)}
                    />
                  ))}
                </div>
              )}
              <button type="button" class="add" onClick={addFilter}>
                + Add filter
              </button>
            </div>
          </div>
          <div class="query-row">
            <span class="query-label">Group by:</span>
            <div class="group-by-options">
              {FILTER_COLUMNS.map((col) => (
                <label key={col.value}>
                  <input
                    type="checkbox"
                    checked={groupBy.includes(col.value)}
                    onChange={(e) => {
                      if ((e.target as HTMLInputElement).checked) {
                        setGroupBy([...groupBy, col.value]);
                      } else {
                        setGroupBy(groupBy.filter((c) => c !== col.value));
                      }
                    }}
                  />{" "}
                  {col.label}
                </label>
              ))}
            </div>
          </div>
          {groupBy.length > 1 && (
            <div class="query-row">
              <span class="query-label">Groups order:</span>
              {groupBy.map((col, idx) => (
                <span key={col} class="order-item">
                  {idx > 0 && (
                    <button
                      type="button"
                      class="order-btn"
                      onClick={() => {
                        const newOrder = [...groupBy];
                        [newOrder[idx - 1], newOrder[idx]] = [
                          newOrder[idx],
                          newOrder[idx - 1],
                        ];
                        setGroupBy(newOrder);
                      }}
                    >
                      ↔
                    </button>
                  )}
                  <span class="order-tag">
                    {FILTER_COLUMNS.find((c) => c.value === col)?.label || col}
                  </span>
                </span>
              ))}
            </div>
          )}
          <div class="run-query-row">
            <button
              type="submit"
              class="run-query"
              disabled={hourlyLimitExceeded}
            >
              <span class="icon">▶</span>Run query
            </button>
            {data && data.buckets.length >= limit && (
              <span class="limit-warning">
                Limit of {limit.toLocaleString()} reached
              </span>
            )}
          </div>
        </form>
      </section>

      {data && (
        <>
          <section>
            <h2>
              <span class="icon">📊</span>Visualization
            </h2>
            <AnalyticsChart
              data={data}
              granularity={granularity}
              stacked={stacked}
              setStacked={setStacked}
            />
          </section>
          <section>
            <h2>
              <span class="icon">📋</span>Data{" "}
              <button
                class="download-csv"
                onClick={() => downloadCSV(data, granularity)}
              >
                Download CSV
              </button>
            </h2>
            <AnalyticsTable data={data} granularity={granularity} />
          </section>
        </>
      )}
    </>
  );
}

function getAllSites(state: any, session: any): Site[] {
  const user = loadUser(state, session?.uid);
  const allSites: Site[] = [];
  if (user?.teams) {
    for (const teamID of user.teams.keys()) {
      const team = loadTeam(state, teamID);
      if (team?.sites) {
        for (const siteID of team.sites.keys()) {
          const s = loadSite(state, siteID);
          if (s) allSites.push(s);
        }
      }
    }
  }
  allSites.sort((a, b) => (a.id || 0) - (b.id || 0));
  return allSites;
}

function AnalyticsPage({ id }: { id?: string }) {
  const state = useContext(StateCtx);
  const ready = state.value.ready;
  const session = loadSession(state.value);

  if (ready && session?.uid === undefined) {
    route("/");
    return <></>;
  }

  const allSites = getAllSites(state.value, session);
  const site = id !== undefined ? loadSite(state.value, Number(id)) : undefined;

  if (ready) {
    if (id === undefined && allSites.length > 0) {
      route(`/analytics/site/${allSites[0].id}${window.location.search}`, true);
      return <></>;
    }
    if (id && site === undefined) {
      route("/admin");
      return <></>;
    }
  }

  return (
    <div class="with-header">
      <Header session={session} />
      <main>
        {!ready ? (
          <h1>Loading…</h1>
        ) : site ? (
          <AnalyticsBody site={site} allSites={allSites} />
        ) : (
          <p>
            <em>No sites available.</em>
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}

export function Analytics() {
  return <AnalyticsPage />;
}

export function SiteAnalytics({ id }: { id: string }) {
  return <AnalyticsPage id={id} />;
}
