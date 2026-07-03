using AlgoFreight.Domain.Entities;
using AlgoFreight.Domain.Enums;
using AlgoFreight.Infrastructure.Data;
using AlgoFreight.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

namespace AlgoFreight.Tests;

public class RepositorySmokeTests
{
    private static AlgoFreightDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AlgoFreightDbContext>()
            .UseInMemoryDatabase($"AlgoFreightTest_{Guid.NewGuid()}")
            .Options;

        return new AlgoFreightDbContext(options);
    }

    [Fact]
    public async Task CargoRepository_AddAndGet_Succeeds()
    {
        using var context = CreateContext();
        var repo = new CargoRepository(context);

        var cargo = new Cargo
        {
            Id = Guid.NewGuid(),
            Description = "Test cargo",
            WeightKg = 100m,
            Destination = "Dhaka",
            Priority = Priority.High,
            IsFragile = false,
            Status = CargoStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var added = await repo.AddAsync(cargo);
        var fetched = await repo.GetByIdAsync(added.Id);

        Assert.NotNull(fetched);
        Assert.Equal("Test cargo", fetched.Description);
        Assert.Equal(100m, fetched.WeightKg);
        Assert.Equal(Priority.High, fetched.Priority);
    }

    [Fact]
    public async Task CargoRepository_GetAll_ReturnsAllItems()
    {
        using var context = CreateContext();
        var repo = new CargoRepository(context);

        context.Cargoes.AddRange(
            new Cargo
            {
                Id = Guid.NewGuid(),
                Description = "Cargo A",
                WeightKg = 50m,
                Destination = "A",
                Priority = Priority.Low,
                IsFragile = false,
                Status = CargoStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new Cargo
            {
                Id = Guid.NewGuid(),
                Description = "Cargo B",
                WeightKg = 150m,
                Destination = "B",
                Priority = Priority.Urgent,
                IsFragile = true,
                Status = CargoStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        );
        await context.SaveChangesAsync();

        var all = await repo.GetAllAsync();
        Assert.Equal(2, all.Count);
    }

    [Fact]
    public async Task TruckRepository_AddAndGet_Succeeds()
    {
        using var context = CreateContext();
        var repo = new TruckRepository(context);

        var truck = new Truck
        {
            Id = Guid.NewGuid(),
            PlateNumber = "ABC-1234",
            MaxCapacityKg = 2000m,
            Route = "Dhaka-Chittagong",
            IsAvailable = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var added = await repo.AddAsync(truck);
        var fetched = await repo.GetByIdAsync(added.Id);

        Assert.NotNull(fetched);
        Assert.Equal("ABC-1234", fetched.PlateNumber);
        Assert.Equal(2000m, fetched.MaxCapacityKg);
        Assert.True(fetched.IsAvailable);
    }

    [Fact]
    public async Task DispatchManifestRepository_AddWithCargoItems_Succeeds()
    {
        using var context = CreateContext();
        var manifestRepo = new DispatchManifestRepository(context);
        var cargoRepo = new CargoRepository(context);

        var cargo = new Cargo
        {
            Id = Guid.NewGuid(),
            Description = "Manifest cargo",
            WeightKg = 300m,
            Destination = "C",
            Priority = Priority.Medium,
            IsFragile = false,
            Status = CargoStatus.Assigned,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await cargoRepo.AddAsync(cargo);

        var truck = new Truck
        {
            Id = Guid.NewGuid(),
            PlateNumber = "XYZ-9999",
            MaxCapacityKg = 5000m,
            Route = "C-D",
            IsAvailable = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Trucks.Add(truck);
        await context.SaveChangesAsync();

        var manifest = new DispatchManifest
        {
            Id = Guid.NewGuid(),
            TruckId = truck.Id,
            RunTimestamp = DateTime.UtcNow,
            TotalWeightKg = 300m,
            AlgorithmUsed = AlgorithmType.GreedyFirstFitDecreasing,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        manifest.ManifestCargoItems.Add(new ManifestCargoItem
        {
            Id = Guid.NewGuid(),
            DispatchManifestId = manifest.Id,
            CargoId = cargo.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        var added = await manifestRepo.AddAsync(manifest);
        var fetched = await manifestRepo.GetByIdAsync(added.Id);

        Assert.NotNull(fetched);
        Assert.Equal(AlgorithmType.GreedyFirstFitDecreasing, fetched.AlgorithmUsed);
        Assert.Single(fetched.ManifestCargoItems);
        Assert.Equal(cargo.Id, fetched.ManifestCargoItems.First().CargoId);
    }
}
