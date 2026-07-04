using AlgoFreight.Application.Services;
using AlgoFreight.Domain.Entities;
using AlgoFreight.Domain.Enums;

namespace AlgoFreight.Tests;

public class DispatchOptimizationServiceTests
{
    private static readonly DateTime Now = DateTime.UtcNow;

    private static Cargo MakeCargo(Guid id, string desc, decimal weightKg, Priority priority, bool fragile = false)
    {
        return new Cargo
        {
            Id = id,
            Description = desc,
            WeightKg = weightKg,
            Destination = "Test",
            Priority = priority,
            IsFragile = fragile,
            Status = CargoStatus.Pending,
            CreatedAt = Now,
            UpdatedAt = Now
        };
    }

    private static Truck MakeTruck(Guid id, string plate, decimal capacity, bool available = true)
    {
        return new Truck
        {
            Id = id,
            PlateNumber = plate,
            MaxCapacityKg = capacity,
            Route = "Test",
            IsAvailable = available,
            CreatedAt = Now,
            UpdatedAt = Now
        };
    }

    [Fact]
    public async Task Greedy_EmptyCargo_ReturnsEmptyAssignments()
    {
        var service = new DispatchOptimizationService();
        var result = await service.RunGreedyMultiTruckAsync(Array.Empty<Cargo>(), new[] { MakeTruck(Guid.NewGuid(), "T1", 1000m) });
        Assert.Empty(result.Assignments);
        Assert.Empty(result.UnassignedCargoIds);
        Assert.Equal(0m, result.TotalPriorityScoreAchieved);
        Assert.Equal(AlgorithmType.GreedyFirstFitDecreasing, result.AlgorithmUsed);
    }

    [Fact]
    public async Task Greedy_SingleCargo_FitsExactly()
    {
        var service = new DispatchOptimizationService();
        var cargoId = Guid.NewGuid();
        var truckId = Guid.NewGuid();
        var result = await service.RunGreedyMultiTruckAsync(
            new[] { MakeCargo(cargoId, "Exact", 100m, Priority.High) },
            new[] { MakeTruck(truckId, "T1", 100m) });
        var a = Assert.Single(result.Assignments);
        Assert.Equal(truckId, a.TruckId);
        Assert.Equal(cargoId, Assert.Single(a.CargoIds));
        Assert.Empty(result.UnassignedCargoIds);
        Assert.Equal(3m, result.TotalPriorityScoreAchieved);
    }

    [Fact]
    public async Task Greedy_CargoHeavierThanAllTrucks_GoesToUnassigned()
    {
        var service = new DispatchOptimizationService();
        var cargoId = Guid.NewGuid();
        var result = await service.RunGreedyMultiTruckAsync(
            new[] { MakeCargo(cargoId, "Heavy", 500m, Priority.Low) },
            new[] { MakeTruck(Guid.NewGuid(), "T1", 100m) });
        Assert.Empty(result.Assignments);
        Assert.Equal(cargoId, Assert.Single(result.UnassignedCargoIds));
        Assert.Equal(0m, result.TotalPriorityScoreAchieved);
    }

    [Fact]
    public async Task Greedy_HigherPriorityDensity_AssignedFirst()
    {
        var service = new DispatchOptimizationService();
        // B(2kg, Urgent, density=2.0) > C(3kg, High, density=1.0) > A(5kg, Urgent, density=0.8)
        var a = MakeCargo(Guid.NewGuid(), "A", 5m, Priority.Urgent);
        var b = MakeCargo(Guid.NewGuid(), "B", 2m, Priority.Urgent);
        var c = MakeCargo(Guid.NewGuid(), "C", 3m, Priority.High);
        var t1 = MakeTruck(Guid.NewGuid(), "T1", 6m);
        var t2 = MakeTruck(Guid.NewGuid(), "T2", 10m);
        var result = await service.RunGreedyMultiTruckAsync(new[] { a, b, c }, new[] { t1, t2 });
        Assert.Contains(result.Assignments, x => x.TruckId == t1.Id && x.CargoIds.Contains(b.Id) && x.CargoIds.Contains(c.Id));
        Assert.Contains(result.Assignments, x => x.TruckId == t2.Id && x.CargoIds.Contains(a.Id));
        Assert.Empty(result.UnassignedCargoIds);
        Assert.Equal(11m, result.TotalPriorityScoreAchieved);
    }

    [Fact]
    public async Task Greedy_AllCargoFits_EverythingAssigned()
    {
        var service = new DispatchOptimizationService();
        var cargoes = Enumerable.Range(1, 10).Select(i => MakeCargo(Guid.NewGuid(), $"C{i}", 10m, Priority.Medium)).ToList();
        var result = await service.RunGreedyMultiTruckAsync(cargoes, new[] { MakeTruck(Guid.NewGuid(), "Big", 200m) });
        Assert.Equal(10, result.Assignments[0].CargoIds.Count);
        Assert.Empty(result.UnassignedCargoIds);
        Assert.Equal(20m, result.TotalPriorityScoreAchieved);
    }

    [Fact]
    public async Task Greedy_NonPendingCargo_IsSkipped()
    {
        var service = new DispatchOptimizationService();
        var c = MakeCargo(Guid.NewGuid(), "Assigned", 50m, Priority.High);
        c.Status = CargoStatus.Assigned;
        var result = await service.RunGreedyMultiTruckAsync(new[] { c }, new[] { MakeTruck(Guid.NewGuid(), "T1", 500m) });
        Assert.Empty(result.Assignments);
        Assert.Empty(result.UnassignedCargoIds);
    }

    [Fact]
    public async Task Greedy_UnavailableTruck_IsSkipped()
    {
        var service = new DispatchOptimizationService();
        var result = await service.RunGreedyMultiTruckAsync(
            new[] { MakeCargo(Guid.NewGuid(), "Needs Truck", 50m, Priority.Medium) },
            new[] { MakeTruck(Guid.NewGuid(), "Out", 500m, available: false) });
        Assert.Empty(result.Assignments);
        Assert.NotEmpty(result.UnassignedCargoIds);
    }

    [Fact]
    public async Task Knapsack_EmptyCargo_ReturnsEmptyResult()
    {
        var service = new DispatchOptimizationService();
        var result = await service.RunExactKnapsackAsync(Array.Empty<Cargo>(), MakeTruck(Guid.NewGuid(), "T1", 100m));
        Assert.Empty(result.Assignments);
        Assert.Empty(result.UnassignedCargoIds);
        Assert.Equal(0m, result.TotalPriorityScoreAchieved);
        Assert.Equal(AlgorithmType.ExactKnapsack, result.AlgorithmUsed);
    }

    [Fact]
    public async Task Knapsack_HandCalculated_OptimalAnswer()
    {
        // 10kg truck. Cargo: A(4,Urgent), B(3,High), C(5,Medium), D(2,Urgent), E(1,Low).
        // Optimal subset: A+B+D+E = 10kg, score 4+3+4+1=12.
        var service = new DispatchOptimizationService();
        var truck = MakeTruck(Guid.NewGuid(), "T1", 10m);
        var a = MakeCargo(Guid.NewGuid(), "A", 4m, Priority.Urgent);
        var b = MakeCargo(Guid.NewGuid(), "B", 3m, Priority.High);
        var c = MakeCargo(Guid.NewGuid(), "C", 5m, Priority.Medium);
        var d = MakeCargo(Guid.NewGuid(), "D", 2m, Priority.Urgent);
        var e = MakeCargo(Guid.NewGuid(), "E", 1m, Priority.Low);
        var result = await service.RunExactKnapsackAsync(new[] { a, b, c, d, e }, truck);
        Assert.Equal(12m, result.TotalPriorityScoreAchieved);
        var ids = result.Assignments[0].CargoIds.ToHashSet();
        Assert.Contains(a.Id, ids); Assert.Contains(b.Id, ids);
        Assert.Contains(d.Id, ids); Assert.Contains(e.Id, ids);
        Assert.DoesNotContain(c.Id, ids);
        Assert.Equal(c.Id, Assert.Single(result.UnassignedCargoIds));
    }

    [Fact]
    public async Task Knapsack_ExactlyFillsCapacity_ZeroWaste()
    {
        var service = new DispatchOptimizationService();
        var result = await service.RunExactKnapsackAsync(
            new[] {
                MakeCargo(Guid.NewGuid(), "A", 5m, Priority.Urgent),
                MakeCargo(Guid.NewGuid(), "B", 3m, Priority.High),
                MakeCargo(Guid.NewGuid(), "C", 2m, Priority.Urgent)
            },
            MakeTruck(Guid.NewGuid(), "T1", 10m));
        Assert.Equal(3, result.Assignments[0].CargoIds.Count);
        Assert.Equal(11m, result.TotalPriorityScoreAchieved);
        Assert.Empty(result.UnassignedCargoIds);
    }

    [Fact]
    public async Task Knapsack_Score_AlwaysBetterOrEqual_Greedy()
    {
        // A(6,Urgent), B(5,High), C(5,High), D(4,Low). 10kg truck.
        // Greedy: A+D=5. DP: B+C=6. DP >= Greedy.
        var service = new DispatchOptimizationService();
        var truck = MakeTruck(Guid.NewGuid(), "T1", 10m);
        var a = MakeCargo(Guid.NewGuid(), "A", 6m, Priority.Urgent);
        var b = MakeCargo(Guid.NewGuid(), "B", 5m, Priority.High);
        var c = MakeCargo(Guid.NewGuid(), "C", 5m, Priority.High);
        var d = MakeCargo(Guid.NewGuid(), "D", 4m, Priority.Low);
        var all = new[] { a, b, c, d };
        var ks = await service.RunExactKnapsackAsync(all, truck);
        var gr = await service.RunGreedyMultiTruckAsync(all, new[] { truck });
        Assert.True(ks.TotalPriorityScoreAchieved >= gr.TotalPriorityScoreAchieved);
    }

    [Fact]
    public async Task Greedy_ExecutionTimeMs_IsPopulated()
    {
        var service = new DispatchOptimizationService();
        var r = await service.RunGreedyMultiTruckAsync(
            Enumerable.Range(1, 100).Select(i => MakeCargo(Guid.NewGuid(), $"C{i}", 10m, Priority.Medium)),
            Enumerable.Range(1, 5).Select(i => MakeTruck(Guid.NewGuid(), $"T{i}", 500m)));
        Assert.True(r.ExecutionTimeMs >= 0);
    }

    [Fact]
    public async Task Knapsack_ExecutionTimeMs_IsPopulated()
    {
        var service = new DispatchOptimizationService();
        var r = await service.RunExactKnapsackAsync(
            Enumerable.Range(1, 50).Select(i => MakeCargo(Guid.NewGuid(), $"C{i}", 10m, Priority.High)),
            MakeTruck(Guid.NewGuid(), "T1", 500m));
        Assert.True(r.ExecutionTimeMs >= 0);
    }

    [Fact]
    [Trait("Category", "Performance")]
    public async Task Greedy_5000Items_CompletesUnderThreshold()
    {
        var service = new DispatchOptimizationService();
        var rng = new Random(42);
        var cargoes = new List<Cargo>();
        for (var i = 0; i < 5000; i++)
            cargoes.Add(MakeCargo(Guid.NewGuid(), $"C{i}", (decimal)(rng.NextDouble() * 500 + 1), (Priority)rng.Next(0, 4)));
        var trucks = new List<Truck>();
        for (var i = 0; i < 50; i++)
            trucks.Add(MakeTruck(Guid.NewGuid(), $"T{i}", (decimal)(rng.NextDouble() * 2000 + 500)));
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var r = await service.RunGreedyMultiTruckAsync(cargoes, trucks);
        sw.Stop();
        Assert.True(r.ExecutionTimeMs >= 0);
        Assert.True(sw.ElapsedMilliseconds < 500, $"Took {sw.ElapsedMilliseconds}ms");
    }
}
