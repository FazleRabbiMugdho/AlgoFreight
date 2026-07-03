using System.Diagnostics;
using AlgoFreight.Application.Dtos;
using AlgoFreight.Application.Interfaces;
using AlgoFreight.Domain.Entities;
using AlgoFreight.Domain.Enums;

namespace AlgoFreight.Application.Services;

public class DispatchOptimizationService : IDispatchOptimizationService
{
    /// <summary>O(n log n + n·m) greedy FFD multi-truck. Approximation.</summary>
    public Task<DispatchResult> RunGreedyMultiTruckAsync(
        IEnumerable<Cargo> pendingCargo,
        IEnumerable<Truck> availableTrucks,
        CancellationToken cancellationToken = default)
    {
        var sw = Stopwatch.StartNew();
        var result = RunGreedy(pendingCargo, availableTrucks);
        sw.Stop();
        return Task.FromResult(result with { ExecutionTimeMs = sw.ElapsedMilliseconds });
    }

    /// <summary>O(n·W) exact 0/1 knapsack DP. Single-truck only — not for production multi-truck use.</summary>
    public Task<DispatchResult> RunExactKnapsackAsync(
        IEnumerable<Cargo> pendingCargo,
        Truck truck,
        CancellationToken cancellationToken = default)
    {
        var sw = Stopwatch.StartNew();
        var result = RunKnapsack(pendingCargo, truck);
        sw.Stop();
        return Task.FromResult(result with { ExecutionTimeMs = sw.ElapsedMilliseconds });
    }

    private static DispatchResult RunGreedy(IEnumerable<Cargo> cargoes, IEnumerable<Truck> trucks)
    {
        var pending = cargoes.Where(c => c.Status == CargoStatus.Pending).ToList();
        var available = trucks.Where(t => t.IsAvailable).ToList();

        if (pending.Count == 0 || available.Count == 0)
        {
            return new DispatchResult(
                Array.Empty<TruckAssignment>(),
                pending.Select(c => c.Id).ToList(),
                0m,
                AlgorithmType.GreedyFirstFitDecreasing,
                0);
        }

        var sorted = pending
            .Select(c => new
            {
                Cargo = c,
                Density = (double)c.Priority.GetWeight() / (double)c.WeightKg
            })
            .OrderByDescending(x => x.Density)
            .ToList();

        var slots = available.Select(t => new TruckSlot(t.Id, (double)t.MaxCapacityKg)).ToList();

        var assignments = new Dictionary<Guid, List<Guid>>();
        foreach (var t in available) assignments[t.Id] = new List<Guid>();

        var unassigned = new List<Guid>();

        foreach (var item in sorted)
        {
            var slot = slots.FirstOrDefault(s => s.RemainingCapacity >= (double)item.Cargo.WeightKg);
            if (slot is null)
            {
                unassigned.Add(item.Cargo.Id);
                continue;
            }
            slot.RemainingCapacity -= (double)item.Cargo.WeightKg;
            assignments[slot.TruckId].Add(item.Cargo.Id);
        }

        var totalScore = 0m;
        var resultAssignments = new List<TruckAssignment>();
        foreach (var kvp in assignments)
        {
            if (kvp.Value.Count == 0) continue;
            totalScore += pending
                .Where(c => kvp.Value.Contains(c.Id))
                .Sum(c => (decimal)c.Priority.GetWeight());
            resultAssignments.Add(new TruckAssignment(kvp.Key, kvp.Value));
        }

        return new DispatchResult(
            resultAssignments, unassigned, totalScore,
            AlgorithmType.GreedyFirstFitDecreasing, 0);
    }

    private static DispatchResult RunKnapsack(IEnumerable<Cargo> cargoes, Truck truck)
    {
        var pending = cargoes.Where(c => c.Status == CargoStatus.Pending).ToList();

        if (pending.Count == 0)
        {
            return new DispatchResult(
                Array.Empty<TruckAssignment>(), Array.Empty<Guid>(),
                0m, AlgorithmType.ExactKnapsack, 0);
        }

        // Scale to kg (not grams) to keep DP table size tractable.
        // A 5000kg truck as grams → W=5e6, as kg → W=5000.
        var cap = (int)Math.Round(truck.MaxCapacityKg, MidpointRounding.AwayFromZero);

        var items = pending
            .Select(c => new KnapsackItem(
                c.Id,
                Math.Max(1, (int)Math.Round(c.WeightKg, MidpointRounding.AwayFromZero)),
                c.Priority.GetWeight()))
            .ToList();

        var n = items.Count;
        var dp = new int[n + 1, cap + 1];

        for (var i = 1; i <= n; i++)
        {
            var it = items[i - 1];
            for (var w = 0; w <= cap; w++)
            {
                dp[i, w] = it.Weight > w
                    ? dp[i - 1, w]
                    : Math.Max(dp[i - 1, w], dp[i - 1, w - it.Weight] + it.Value);
            }
        }

        var selected = new List<Guid>();
        for (int i = n, w = cap; i > 0 && w > 0; i--)
        {
            if (dp[i, w] == dp[i - 1, w]) continue;
            selected.Add(items[i - 1].Id);
            w -= items[i - 1].Weight;
        }

        var assigned = new HashSet<Guid>(selected);
        var unassignedIds = pending.Select(c => c.Id).Where(id => !assigned.Contains(id)).ToList();

        var score = pending.Where(c => assigned.Contains(c.Id))
            .Sum(c => (decimal)c.Priority.GetWeight());

        var assignment = selected.Count > 0
            ? new List<TruckAssignment> { new(truck.Id, selected) }
            : new List<TruckAssignment>();

        return new DispatchResult(assignment, unassignedIds, score, AlgorithmType.ExactKnapsack, 0);
    }

    private sealed class TruckSlot
    {
        public Guid TruckId { get; }
        public double RemainingCapacity { get; set; }
        public TruckSlot(Guid truckId, double cap) { TruckId = truckId; RemainingCapacity = cap; }
    }

    private sealed record KnapsackItem(Guid Id, int Weight, int Value);
}
