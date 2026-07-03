using AlgoFreight.Application.Dtos;
using AlgoFreight.Application.Interfaces;
using AlgoFreight.Application.Services;
using AlgoFreight.Domain.Entities;
using AlgoFreight.Domain.Enums;
using Microsoft.Extensions.Logging;
using Moq;

namespace AlgoFreight.Tests;

public class DispatchRunServiceTests
{
    private static readonly DateTime Now = DateTime.UtcNow;

    private static Cargo MakeCargo(Guid id, string desc, decimal weightKg, Priority priority, CargoStatus status = CargoStatus.Pending)
    {
        return new Cargo
        {
            Id = id,
            Description = desc,
            WeightKg = weightKg,
            Destination = "Test",
            Priority = priority,
            IsFragile = false,
            Status = status,
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

    private static Mock<ILogger<T>> CreateLogger<T>() where T : class
    {
        return new Mock<ILogger<T>>();
    }

    [Fact]
    public async Task Execute_Greedy_SuccessfullyPersistsManifestAndUpdatesCargo()
    {
        // Arrange
        var cargoId = Guid.NewGuid();
        var truckId = Guid.NewGuid();
        var cargo = MakeCargo(cargoId, "Widget", 50m, Priority.High);
        var truck = MakeTruck(truckId, "T1", 200m);

        var cargoRepo = new Mock<ICargoRepository>();
        cargoRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Cargo> { cargo });

        var truckRepo = new Mock<ITruckRepository>();
        truckRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Truck> { truck });

        var manifestRepo = new Mock<IDispatchManifestRepository>();
        manifestRepo.Setup(r => r.AddAsync(It.IsAny<DispatchManifest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((DispatchManifest m, CancellationToken _) => m);

        var optimizer = new Mock<IDispatchOptimizationService>();
        optimizer.Setup(o => o.RunGreedyMultiTruckAsync(
                It.IsAny<IEnumerable<Cargo>>(),
                It.IsAny<IEnumerable<Truck>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DispatchResult(
                new List<TruckAssignment> { new(truckId, new List<Guid> { cargoId }) },
                new List<Guid>(),
                3m,
                AlgorithmType.GreedyFirstFitDecreasing,
                5));

        var uow = new Mock<IUnitOfWork>();
        var logger = CreateLogger<DispatchRunService>();

        var service = new DispatchRunService(
            cargoRepo.Object, truckRepo.Object, manifestRepo.Object,
            optimizer.Object, uow.Object, logger.Object);

        // Act
        var result = await service.ExecuteAsync(AlgorithmType.GreedyFirstFitDecreasing, null);

        // Assert
        Assert.Single(result.Manifests);
        Assert.Equal(truckId, result.Manifests[0].TruckId);
        Assert.Equal(AlgorithmType.GreedyFirstFitDecreasing, result.AlgorithmUsed);
        Assert.Equal(3m, result.TotalPriorityScoreAchieved);
        Assert.Empty(result.UnassignedCargoIds);

        // Verify transaction was committed
        uow.Verify(u => u.BeginTransactionAsync(It.IsAny<System.Data.IsolationLevel>(), It.IsAny<CancellationToken>()), Times.Once);
        uow.Verify(u => u.CommitAsync(It.IsAny<CancellationToken>()), Times.Once);
        uow.Verify(u => u.RollbackAsync(It.IsAny<CancellationToken>()), Times.Never);

        // Verify cargo was updated
        cargoRepo.Verify(r => r.UpdateAsync(
            It.Is<Cargo>(c => c.Id == cargoId && c.Status == CargoStatus.Assigned && c.TruckId == truckId),
            It.IsAny<CancellationToken>()), Times.Once);

        // Verify manifest was saved
        manifestRepo.Verify(r => r.AddAsync(It.IsAny<DispatchManifest>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Execute_Knapsack_SuccessfullyPersistsManifest()
    {
        // Arrange
        var cargoId = Guid.NewGuid();
        var truckId = Guid.NewGuid();
        var cargo = MakeCargo(cargoId, "Widget", 50m, Priority.Urgent);
        var truck = MakeTruck(truckId, "T1", 200m);

        var cargoRepo = new Mock<ICargoRepository>();
        cargoRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Cargo> { cargo });

        var truckRepo = new Mock<ITruckRepository>();
        truckRepo.Setup(r => r.GetByIdAsync(truckId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(truck);

        var manifestRepo = new Mock<IDispatchManifestRepository>();
        manifestRepo.Setup(r => r.AddAsync(It.IsAny<DispatchManifest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((DispatchManifest m, CancellationToken _) => m);

        var optimizer = new Mock<IDispatchOptimizationService>();
        optimizer.Setup(o => o.RunExactKnapsackAsync(
                It.IsAny<IEnumerable<Cargo>>(),
                It.IsAny<Truck>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DispatchResult(
                new List<TruckAssignment> { new(truckId, new List<Guid> { cargoId }) },
                new List<Guid>(),
                4m,
                AlgorithmType.ExactKnapsack,
                10));

        var uow = new Mock<IUnitOfWork>();
        var logger = CreateLogger<DispatchRunService>();

        var service = new DispatchRunService(
            cargoRepo.Object, truckRepo.Object, manifestRepo.Object,
            optimizer.Object, uow.Object, logger.Object);

        // Act
        var result = await service.ExecuteAsync(AlgorithmType.ExactKnapsack, truckId);

        // Assert
        Assert.Single(result.Manifests);
        Assert.Equal(AlgorithmType.ExactKnapsack, result.AlgorithmUsed);
        Assert.Equal(4m, result.TotalPriorityScoreAchieved);

        uow.Verify(u => u.CommitAsync(It.IsAny<CancellationToken>()), Times.Once);
        uow.Verify(u => u.RollbackAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Execute_KnapsackWithoutTruckId_ThrowsInvalidOperation()
    {
        var cargoRepo = new Mock<ICargoRepository>();
        var truckRepo = new Mock<ITruckRepository>();
        var manifestRepo = new Mock<IDispatchManifestRepository>();
        var optimizer = new Mock<IDispatchOptimizationService>();
        var uow = new Mock<IUnitOfWork>();
        var logger = CreateLogger<DispatchRunService>();

        var service = new DispatchRunService(
            cargoRepo.Object, truckRepo.Object, manifestRepo.Object,
            optimizer.Object, uow.Object, logger.Object);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ExecuteAsync(AlgorithmType.ExactKnapsack, null));
    }

    [Fact]
    public async Task Execute_FailureMidOperation_TriggersRollback()
    {
        // Arrange
        var cargoA = MakeCargo(Guid.NewGuid(), "A", 30m, Priority.High);
        var cargoB = MakeCargo(Guid.NewGuid(), "B", 20m, Priority.Medium);
        var truckId = Guid.NewGuid();
        var truck = MakeTruck(truckId, "T1", 200m);

        var cargoRepo = new Mock<ICargoRepository>();
        cargoRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Cargo> { cargoA, cargoB });

        var truckRepo = new Mock<ITruckRepository>();
        truckRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Truck> { truck });

        var manifestRepo = new Mock<IDispatchManifestRepository>();
        manifestRepo.Setup(r => r.AddAsync(It.IsAny<DispatchManifest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((DispatchManifest m, CancellationToken _) => m);

        var optimizer = new Mock<IDispatchOptimizationService>();
        optimizer.Setup(o => o.RunGreedyMultiTruckAsync(
                It.IsAny<IEnumerable<Cargo>>(),
                It.IsAny<IEnumerable<Truck>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DispatchResult(
                new List<TruckAssignment> { new(truckId, new List<Guid> { cargoA.Id, cargoB.Id }) },
                new List<Guid>(),
                5m,
                AlgorithmType.GreedyFirstFitDecreasing,
                3));

        // Simulate failure on the second cargo update
        var callCount = 0;
        cargoRepo.Setup(r => r.UpdateAsync(It.IsAny<Cargo>(), It.IsAny<CancellationToken>()))
            .Callback(() =>
            {
                callCount++;
                if (callCount == 2)
                    throw new InvalidOperationException("Simulated DB failure");
            })
            .Returns(Task.CompletedTask);

        var uow = new Mock<IUnitOfWork>();
        var logger = CreateLogger<DispatchRunService>();

        var service = new DispatchRunService(
            cargoRepo.Object, truckRepo.Object, manifestRepo.Object,
            optimizer.Object, uow.Object, logger.Object);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ExecuteAsync(AlgorithmType.GreedyFirstFitDecreasing, null));

        // Verify rollback was called
        uow.Verify(u => u.RollbackAsync(It.IsAny<CancellationToken>()), Times.Once);
        uow.Verify(u => u.CommitAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Execute_NonPendingCargo_IsSkipped()
    {
        // Arrange
        var cargoId = Guid.NewGuid();
        var truckId = Guid.NewGuid();
        var deliveredCargo = MakeCargo(cargoId, "Delivered", 50m, Priority.High, CargoStatus.Delivered);
        var truck = MakeTruck(truckId, "T1", 200m);

        var cargoRepo = new Mock<ICargoRepository>();
        cargoRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Cargo> { deliveredCargo });

        var truckRepo = new Mock<ITruckRepository>();
        truckRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Truck> { truck });

        var manifestRepo = new Mock<IDispatchManifestRepository>();
        var optimizer = new Mock<IDispatchOptimizationService>();
        optimizer.Setup(o => o.RunGreedyMultiTruckAsync(
                It.Is<IEnumerable<Cargo>>(c => !c.Any()),
                It.IsAny<IEnumerable<Truck>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DispatchResult(
                new List<TruckAssignment>(),
                new List<Guid>(),
                0m,
                AlgorithmType.GreedyFirstFitDecreasing,
                0));

        var uow = new Mock<IUnitOfWork>();
        var logger = CreateLogger<DispatchRunService>();

        var service = new DispatchRunService(
            cargoRepo.Object, truckRepo.Object, manifestRepo.Object,
            optimizer.Object, uow.Object, logger.Object);

        // Act
        var result = await service.ExecuteAsync(AlgorithmType.GreedyFirstFitDecreasing, null);

        // Assert
        Assert.Empty(result.Manifests);
        Assert.Equal(0m, result.TotalPriorityScoreAchieved);
    }

    [Fact]
    public async Task Execute_NoAvailableTrucks_ReturnsEmpty()
    {
        // Arrange
        var cargo = MakeCargo(Guid.NewGuid(), "Cargo", 50m, Priority.High);

        var cargoRepo = new Mock<ICargoRepository>();
        cargoRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Cargo> { cargo });

        var truckRepo = new Mock<ITruckRepository>();
        truckRepo.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Truck>());

        var manifestRepo = new Mock<IDispatchManifestRepository>();
        var optimizer = new Mock<IDispatchOptimizationService>();
        optimizer.Setup(o => o.RunGreedyMultiTruckAsync(
                It.IsAny<IEnumerable<Cargo>>(),
                It.IsAny<IEnumerable<Truck>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new DispatchResult(
                new List<TruckAssignment>(),
                new List<Guid> { cargo.Id },
                0m,
                AlgorithmType.GreedyFirstFitDecreasing,
                0));

        var uow = new Mock<IUnitOfWork>();
        var logger = CreateLogger<DispatchRunService>();

        var service = new DispatchRunService(
            cargoRepo.Object, truckRepo.Object, manifestRepo.Object,
            optimizer.Object, uow.Object, logger.Object);

        var result = await service.ExecuteAsync(AlgorithmType.GreedyFirstFitDecreasing, null);

        Assert.Empty(result.Manifests);
        Assert.Equal(cargo.Id, Assert.Single(result.UnassignedCargoIds));
    }
}
