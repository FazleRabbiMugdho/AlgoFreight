import { get, post, put, del } from './apiClient';
import type { Cargo, CreateCargoRequest, UpdateCargoRequest, ParsedCargoResponse, ParseCargoRequest } from '../types';

export const cargoApi = {
  getAll: () => get<Cargo[]>('/api/cargo'),

  getById: (id: string) => get<Cargo>(`/api/cargo/${id}`),

  create: (data: CreateCargoRequest) => post<Cargo>('/api/cargo', data),

  update: (id: string, data: UpdateCargoRequest) => put<void>(`/api/cargo/${id}`, data),

  delete: (id: string) => del(`/api/cargo/${id}`),

  parseNaturalLanguage: (text: string) => post<ParsedCargoResponse>('/api/cargo/parse', { text } as ParseCargoRequest),
};
