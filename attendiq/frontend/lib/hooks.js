"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { studentApi } from "./api";

/**
 * Loads data with loading / error / reload state.
 * `loader` is a function returning a promise; `deps` re-run it.
 */
export function useApi(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    loaderRef.current()
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((error) => live && error.name !== "AbortError" && setState((s) => ({ ...s, error, loading: false })));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((fn) => setState((s) => ({ ...s, data: typeof fn === "function" ? fn(s.data) : fn })), []);
  return { ...state, reload, setData };
}

// The attendance requirement is owned by the backend (planner endpoints report it).
// Fetch it once per page load and share it.
let thresholdPromise = null;
export function useThreshold() {
  const [threshold, setThreshold] = useState(null);
  useEffect(() => {
    let live = true;
    thresholdPromise ??= studentApi.bunk(1).then((r) => r.threshold).catch((e) => { thresholdPromise = null; throw e; });
    thresholdPromise.then((t) => live && setThreshold(t)).catch(() => {});
    return () => { live = false; };
  }, []);
  return threshold;
}
export const resetThresholdCache = () => { thresholdPromise = null; };

/** Re-render every `ms` so relative times and "live now" states stay fresh. */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}
