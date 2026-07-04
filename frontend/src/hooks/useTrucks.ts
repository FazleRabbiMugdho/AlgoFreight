import { useState, useEffect, useCallback } from 'react';
import { truckApi } from '../api/truckApi';
import type { Truck, CreateTruckRequest, UpdateTruckRequest } from '../types';
import { ApiRequestError } from '../api/apiClient';

interface UseTrucksReturn {
  trucks: Truck[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createTruck: (data: CreateTruckRequest) => Promise<Truck>;
  updateTruck: (id: string, data: UpdateTruckRequest) => Promise<void>;
  deleteTruck: (id: string) => Promise<void>;
  maxCapacity: number;
  availableTrucks: Truck[];
}

export function useTrucks(): UseTrucksReturn {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrucks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await truckApi.getAll();
      setTrucks(data);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError('Failed to load trucks');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTrucks();
  }, [fetchTrucks]);

  const createTruck = useCallback(async (data: CreateTruckRequest) => {
    const created = await truckApi.create(data);
    setTrucks((prev) => [...prev, created]);
    return created;
  }, []);

  const updateTruck = useCallback(async (id: string, data: UpdateTruckRequest) => {
    await truckApi.update(id, data);
    setTrucks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data } : t)),
    );
  }, []);

  const deleteTruck = useCallback(async (id: string) => {
    await truckApi.delete(id);
    setTrucks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const maxCapacity = trucks.length > 0
    ? Math.max(...trucks.map((t) => t.maxCapacityKg))
    : 0;

  const availableTrucks = trucks.filter((t) => t.isAvailable);

  return {
    trucks,
    isLoading,
    error,
    refetch: fetchTrucks,
    createTruck,
    updateTruck,
    deleteTruck,
    maxCapacity,
    availableTrucks,
  };
}
