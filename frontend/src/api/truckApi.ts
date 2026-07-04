import { get, post, put, del } from './apiClient';
import type { Truck, CreateTruckRequest, UpdateTruckRequest } from '../types';

export const truckApi = {
  getAll: () => get<Truck[]>('/api/truck'),

  getById: (id: string) => get<Truck>(`/api/truck/${id}`),

  create: (data: CreateTruckRequest) => post<Truck>('/api/truck', data),

  update: (id: string, data: UpdateTruckRequest) => put<void>(`/api/truck/${id}`, data),

  delete: (id: string) => del(`/api/truck/${id}`),
};
