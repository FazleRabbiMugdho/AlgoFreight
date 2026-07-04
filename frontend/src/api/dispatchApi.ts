import { get, post } from './apiClient';
import type { DispatchRunResponse, HistoryResponse, DispatchRunRequest } from '../types';

export const dispatchApi = {
  runDispatch: (algorithm: string, truckId?: string | null) =>
    post<DispatchRunResponse>('/api/dispatch/run', {
      algorithm,
      truckId: truckId ?? null,
    } as DispatchRunRequest),

  getHistory: (page = 1, pageSize = 20) =>
    get<HistoryResponse>(`/api/dispatch/history?page=${page}&pageSize=${pageSize}`),
};
