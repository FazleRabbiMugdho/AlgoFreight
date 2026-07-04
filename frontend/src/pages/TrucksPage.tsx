import { useState } from 'react';
import { useTrucks } from '../hooks/useTrucks';
import { TruckTable } from '../components/TruckTable';
import { ErrorBanner } from '../components/ErrorBanner';
import type { Truck } from '../types';
import { ApiRequestError } from '../api/apiClient';

export function TrucksPage() {
  const { trucks, isLoading, error, refetch, createTruck, updateTruck, deleteTruck } = useTrucks();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ plateNumber: '', maxCapacityKg: '', route: '', isAvailable: true });
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [editForm, setEditForm] = useState({ plateNumber: '', maxCapacityKg: 0, route: '', isAvailable: true });
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plateNumber || !form.maxCapacityKg || !form.route) return;
    try {
      await createTruck({
        plateNumber: form.plateNumber,
        maxCapacityKg: parseFloat(form.maxCapacityKg),
        route: form.route,
        isAvailable: form.isAvailable,
      });
      setForm({ plateNumber: '', maxCapacityKg: '', route: '', isAvailable: true });
      setActionError(null);
    } catch (err) {
      if (err instanceof ApiRequestError) setActionError(err.message);
      else setActionError('Failed to create truck');
    }
  };

  const handleEdit = (truck: Truck) => {
    setEditingTruck(truck);
    setEditForm({
      plateNumber: truck.plateNumber,
      maxCapacityKg: truck.maxCapacityKg,
      route: truck.route,
      isAvailable: truck.isAvailable,
    });
  };

  const handleUpdate = async () => {
    if (!editingTruck) return;
    try {
      await updateTruck(editingTruck.id, editForm);
      setEditingTruck(null);
      setActionError(null);
    } catch (err) {
      if (err instanceof ApiRequestError) setActionError(err.message);
      else setActionError('Failed to update truck');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTruck(id);
    } catch (err) {
      if (err instanceof ApiRequestError) setActionError(err.message);
      else setActionError('Failed to delete truck');
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Fleet Management</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {showForm ? 'Hide Form' : 'Add Truck'}
        </button>
      </div>

      {actionError && (
        <div className="mb-4">
          <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
        </div>
      )}

      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onDismiss={refetch} />
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 max-w-md space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <input
            value={form.plateNumber}
            onChange={(e) => setForm((p) => ({ ...p, plateNumber: e.target.value }))}
            placeholder="Plate Number"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            required
          />
          <input
            type="number"
            value={form.maxCapacityKg}
            onChange={(e) => setForm((p) => ({ ...p, maxCapacityKg: e.target.value }))}
            placeholder="Max Capacity (kg)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            required
          />
          <input
            value={form.route}
            onChange={(e) => setForm((p) => ({ ...p, route: e.target.value }))}
            placeholder="Route"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            required
          />
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={form.isAvailable}
              onChange={(e) => setForm((p) => ({ ...p, isAvailable: e.target.checked }))}
            />
            Available
          </label>
          <button type="submit" className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
            Add Truck
          </button>
        </form>
      )}

      <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <TruckTable
          trucks={trucks}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Edit Modal */}
      {editingTruck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
            <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">Edit Truck</h3>
            <div className="space-y-3">
              <input
                value={editForm.plateNumber}
                onChange={(e) => setEditForm((p) => ({ ...p, plateNumber: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
              <input
                type="number"
                value={editForm.maxCapacityKg}
                onChange={(e) => setEditForm((p) => ({ ...p, maxCapacityKg: parseFloat(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
              <input
                value={editForm.route}
                onChange={(e) => setEditForm((p) => ({ ...p, route: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <input type="checkbox" checked={editForm.isAvailable} onChange={(e) => setEditForm((p) => ({ ...p, isAvailable: e.target.checked }))} />
                Available
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditingTruck(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700">
                Cancel
              </button>
              <button onClick={handleUpdate} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
