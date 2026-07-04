using AlgoFreight.Application.Dtos;
using AlgoFreight.Domain.Entities;

namespace AlgoFreight.Application.Interfaces;

public interface IDispatchOptimizationService
{
    /// <summary>
    /// Greedy first-fit decreasing multi-truck dispatch.
    /// O(n log n + n·m) approximation — not globally optimal.
    /// </summary>
    Task<DispatchResult> RunGreedyMultiTruckAsync(
        IEnumerable<Cargo> pendingCargo,
        IEnumerable<Truck> availableTrucks,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Exact 0/1 knapsack DP for a single truck (demonstration only, not for multi-truck production use).
    /// O(n·W) where W = scaled capacity in kg.
    /// </summary>
    Task<DispatchResult> RunExactKnapsackAsync(
        IEnumerable<Cargo> pendingCargo,
        Truck truck,
        CancellationToken cancellationToken = default);
}
