import { useState, useEffect, useCallback } from 'react';
import { dispatchApi } from '../api/dispatchApi';
import type { ManifestRecord } from '../types';
import { ApiRequestError } from '../api/apiClient';

interface UseDispatchHistoryReturn {
  manifests: ManifestRecord[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  refetch: () => Promise<void>;
}

export function useDispatchHistory(): UseDispatchHistoryReturn {
  const [manifests, setManifests] = useState<ManifestRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await dispatchApi.getHistory(page, pageSize);
      setManifests(data.items);
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError('Failed to load dispatch history');
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
  }, [fetchHistory]);

  return {
    manifests,
    totalCount,
    totalPages,
    page,
    pageSize,
    isLoading,
    error,
    setPage,
    refetch: fetchHistory,
  };
}
