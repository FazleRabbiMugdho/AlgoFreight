import { useState, useEffect, useCallback } from 'react';
import { cargoApi } from '../api/cargoApi';
import type { Cargo, CreateCargoRequest, UpdateCargoRequest } from '../types';
import { ApiRequestError } from '../api/apiClient';

interface UseCargoReturn {
  cargoes: Cargo[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCargo: (data: CreateCargoRequest) => Promise<Cargo>;
  updateCargo: (id: string, data: UpdateCargoRequest) => Promise<void>;
  deleteCargo: (id: string) => Promise<void>;
  pendingCargoes: Cargo[];
}

export function useCargo(): UseCargoReturn {
  const [cargoes, setCargoes] = useState<Cargo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCargoes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await cargoApi.getAll();
      setCargoes(data);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError('Failed to load cargo');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCargoes();
  }, [fetchCargoes]);

  const createCargo = useCallback(async (data: CreateCargoRequest) => {
    const created = await cargoApi.create(data);
    setCargoes((prev) => [...prev, created]);
    return created;
  }, []);

  const updateCargo = useCallback(async (id: string, data: UpdateCargoRequest) => {
    await cargoApi.update(id, data);
    setCargoes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c)),
    );
  }, []);

  const deleteCargo = useCallback(async (id: string) => {
    await cargoApi.delete(id);
    setCargoes((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const pendingCargoes = cargoes.filter((c) => c.status === 'Pending');

  return {
    cargoes,
    isLoading,
    error,
    refetch: fetchCargoes,
    createCargo,
    updateCargo,
    deleteCargo,
    pendingCargoes,
  };
}
