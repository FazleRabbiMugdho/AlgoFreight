export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type CargoStatus = 'Pending' | 'Assigned' | 'Delivered';

export type AlgorithmType = 'GreedyFirstFitDecreasing' | 'ExactKnapsack';

export interface Cargo {
  id: string;
  description: string;
  weightKg: number;
  destination: string;
  priority: Priority;
  isFragile: boolean;
  status: CargoStatus;
  truckId: string | null;
}

export interface Truck {
  id: string;
  plateNumber: string;
  maxCapacityKg: number;
  route: string;
  isAvailable: boolean;
}

export interface TruckAssignment {
  truckId: string;
  cargoIds: string[];
}

export interface DispatchResult {
  assignments: TruckAssignment[];
  unassignedCargoIds: string[];
  totalPriorityScoreAchieved: number;
  algorithmUsed: AlgorithmType;
  executionTimeMs: number;
}

export interface ManifestRecord {
  id: string;
  truckId: string;
  totalWeightKg: number;
  cargoIds?: string[];
  cargoCount?: number;
  algorithmUsed: string;
  runTimestamp: string;
}

export interface DispatchRunResponse {
  manifests: ManifestRecord[];
  unassignedCargoIds: string[];
  totalPriorityScoreAchieved: number;
  algorithmUsed: string;
  executionTimeMs: number;
}

export interface HistoryResponse {
  items: ManifestRecord[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateCargoRequest {
  description: string;
  weightKg: number;
  destination: string;
  priority: Priority;
  isFragile: boolean;
}

export interface UpdateCargoRequest {
  description: string;
  weightKg: number;
  destination: string;
  priority: Priority;
  isFragile: boolean;
}

export interface CreateTruckRequest {
  plateNumber: string;
  maxCapacityKg: number;
  route: string;
  isAvailable: boolean;
}

export interface UpdateTruckRequest {
  plateNumber: string;
  maxCapacityKg: number;
  route: string;
  isAvailable: boolean;
}

export interface DispatchRunRequest {
  algorithm: string;
  truckId?: string | null;
}

export interface ParseCargoRequest {
  text: string;
}

export interface ParsedCargoResponse {
  id: string;
  description: string;
  weightKg: number;
  destination: string;
  priority: string;
  isFragile: boolean;
  status: string;
  truckId: string | null;
}

export interface SignalRDispatchPayload {
  manifestIds: string[];
  truckIds: string[];
  cargoCount: number;
  totalPriorityScore: number;
  algorithmUsed: string;
  timestamp: string;
}

export interface ApiError {
  status: number;
  message: string;
}

export type ConnectionState = 'Connecting' | 'Connected' | 'Disconnected' | 'Reconnecting';
