"use client";

// Generic data fetching hook
// Production — real API data only

import { useState, useEffect, useCallback } from "react";
import type { DataSource } from "@/lib/services/types";

interface UseDataResult<T> {
  data: T;
  loading: boolean;
  error: Error | null;
  source: DataSource;
  refetch: () => void;
}

/**
 * Generic hook for data services.
 * Takes an async fetcher and a fallback default value.
 * Returns { data, loading, error, source, refetch }
 */
export function useDataService<T>(
  fetcher: () => Promise<{ data: T; source: DataSource }>,
  defaultValue: T,
): UseDataResult<T> {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [source, setSource] = useState<DataSource>("api");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result.data);
      setSource(result.source);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, source, refetch: fetchData };
}
