import { useState } from 'react';
import { useCargo } from '../hooks/useCargo';
import { useTrucks } from '../hooks/useTrucks';
import { CargoTable } from '../components/CargoTable';
import { CargoIntakeForm } from '../components/CargoIntakeForm';
import { ErrorBanner } from '../components/ErrorBanner';
import type { CreateCargoRequest, Cargo } from '../types';
import { ApiRequestError } from '../api/apiClient';

export function CargoPage() {
  const { cargoes, isLoading, error: cargoError, refetch, createCargo, updateCargo, deleteCargo } = useCargo();
  const { maxCapacity } = useTrucks();
  const [editingCargo, setEditingCargo] = useState<Cargo | null>(null);
  const [editForm, setEditForm] = useState({ description: '', weightKg: 0, destination: '', priority: '', isFragile: false });
  const [actionError, setActionError] = useState<string | null>(null);
  const [showIntakeForm, setShowIntakeForm] = useState(false);

  const handleCreate = async (data: CreateCargoRequest) => {
    await createCargo(data);
  };

  const handleEdit = (cargo: Cargo) => {
    setEditingCargo(cargo);
    setEditForm({
      description: cargo.description,
      weightKg: cargo.weightKg,
      destination: cargo.destination,
      priority: cargo.priority,
      isFragile: cargo.isFragile,
    });
  };

  const handleUpdate = async () => {
    if (!editingCargo) return;
    try {
      await updateCargo(editingCargo.id, {
        description: editForm.description,
        weightKg: editForm.weightKg,
        destination: editForm.destination,
        priority: editForm.priority as 'Low' | 'Medium' | 'High' | 'Urgent',
        isFragile: editForm.isFragile,
      });
      setEditingCargo(null);
      setActionError(null);
    } catch (err) {
      if (err instanceof ApiRequestError) setActionError(err.message);
      else setActionError('Failed to update cargo');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCargo(id);
    } catch (err) {
      if (err instanceof ApiRequestError) setActionError(err.message);
      else setActionError('Failed to delete cargo');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Cargo Management</h2>
        <button
          onClick={() => setShowIntakeForm(!showIntakeForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {showIntakeForm ? 'Hide Form' : 'Add Cargo'}
        </button>
      </div>

      {actionError && (
        <div className="mb-4">
          <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
        </div>
      )}

      {cargoError && (
        <div className="mb-4">
          <ErrorBanner message={cargoError} onDismiss={refetch} />
        </div>
      )}

      {showIntakeForm && (
        <div className="mb-6 max-w-md">
          <CargoIntakeForm maxCapacity={maxCapacity} onSubmit={handleCreate} />
        </div>
      )}

      {/* Edit Modal */}
      {editingCargo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
            <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Edit Cargo</h3>
            <div className="space-y-3">
              <input
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
              <div className="flex gap-3">
                <input
                  type="number"
                  value={editForm.weightKg}
                  onChange={(e) => setEditForm((p) => ({ ...p, weightKg: parseFloat(e.target.value) || 0 }))}
                  placeholder="Weight (kg)"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                />
                <input
                  value={editForm.destination}
                  onChange={(e) => setEditForm((p) => ({ ...p, destination: e.target.value }))}
                  placeholder="Destination"
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                />
              </div>
              <div className="flex gap-3">
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm((p) => ({ ...p, priority: e.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={editForm.isFragile}
                    onChange={(e) => setEditForm((p) => ({ ...p, isFragile: e.target.checked }))}
                  />
                  Fragile
                </label>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditingCargo(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700">
                Cancel
              </button>
              <button onClick={handleUpdate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <CargoTable
          cargoes={cargoes}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
