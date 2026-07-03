using System.Diagnostics;
using AlgoFreight.Application.Dtos;
using AlgoFreight.Application.Interfaces;
using AlgoFreight.Domain.Entities;
using AlgoFreight.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace AlgoFreight.Application.Services;

/// <summary>
/// Orchestrates a full dispatch run: loads pending cargo and available
/// trucks, runs the requested optimization algorithm, persists the result
/// as one or more DispatchManifests, and updates affected Cargo records.
/// All writes are wrapped in an explicit database transaction for atomicity.
///
/// This class has ZERO references to SignalR — notification is handled in
/// the API layer (controller) so this service remains unit-testable without
/// a real hub context.
/// </summary>
public sealed class DispatchRunService
{
    private readonly ICargoRepository _cargoRepo;
    private readonly ITruckRepository _truckRepo;
    private readonly IDispatchManifestRepository _manifestRepo;
    private readonly IDispatchOptimizationService _optimizer;
    private readonly IUnitOfWork _uow;
    private readonly ILogger<DispatchRunService> _logger;

    public DispatchRunService(
        ICargoRepository cargoRepo,
        ITruckRepository truckRepo,
        IDispatchManifestRepository manifestRepo,
        IDispatchOptimizationService optimizer,
        IUnitOfWork uow,
        ILogger<DispatchRunService> logger)
    {
        _cargoRepo = cargoRepo;
        _truckRepo = truckRepo;
        _manifestRepo = manifestRepo;
        _optimizer = optimizer;
        _uow = uow;
        _logger = logger;
    }

    /// <summary>
    /// Executes a dispatch run, persists the results transactionally, and
    /// returns a list of saved DispatchManifests (one per truck assignment).
    /// </summary>
    /// <param name="algorithm">The optimization algorithm to use.</param>
    /// <param name="truckId">
    /// Optional single-truck override for ExactKnapsack. When null and
    /// algorithm is ExactKnapsack, an error is returned. When null and
    /// algorithm is GreedyFirstFitDecreasing, all available trucks are used.
    /// </param>
    /// <returns>List of saved DispatchManifests and metadata about the run.</returns>
    public async Task<DispatchRunResult> ExecuteAsync(
        AlgorithmType algorithm,
        Guid? truckId = null,
        CancellationToken cancellationToken = default)
    {
        var sw = Stopwatch.StartNew();

        // Validate upfront before loading data.
        if (algorithm == AlgorithmType.ExactKnapsack && !truckId.HasValue)
            throw new InvalidOperationException(
                "ExactKnapsack requires a single truck (truckId must be specified).");

        var allCargo = await _cargoRepo.GetAllAsync(cancellationToken);
        var pendingCargo = allCargo.Where(c => c.Status == CargoStatus.Pending).ToList();

        var truck = truckId.HasValue
            ? await _truckRepo.GetByIdAsync(truckId.Value, cancellationToken)
                ?? throw new InvalidOperationException($"Truck {truckId} not found.")
            : null;

        IReadOnlyList<Truck> availableTrucks;
        if (truck is not null)
        {
            availableTrucks = new List<Truck> { truck };
        }
        else
        {
            availableTrucks = (await _truckRepo.GetAllAsync(cancellationToken))
                .Where(t => t.IsAvailable)
                .ToList();
        }

        DispatchResult optimizationResult;
        if (algorithm == AlgorithmType.ExactKnapsack)
        {
            optimizationResult = await _optimizer.RunExactKnapsackAsync(
                pendingCargo, truck!, cancellationToken);
        }
        else
        {
            optimizationResult = await _optimizer.RunGreedyMultiTruckAsync(
                pendingCargo, availableTrucks, cancellationToken);
        }

        // ---- transactional persistence ----
        await _uow.BeginTransactionAsync(cancellationToken: cancellationToken);

        try
        {
            var savedManifests = new List<DispatchManifest>();
            var now = DateTime.UtcNow;

            foreach (var assignment in optimizationResult.Assignments)
            {
                var manifest = new DispatchManifest
                {
                    Id = Guid.NewGuid(),
                    TruckId = assignment.TruckId,
                    RunTimestamp = now,
                    TotalWeightKg = pendingCargo
                        .Where(c => assignment.CargoIds.Contains(c.Id))
                        .Sum(c => c.WeightKg),
                    AlgorithmUsed = algorithm,
                    CreatedAt = now,
                    UpdatedAt = now
                };

                foreach (var cargoId in assignment.CargoIds)
                {
                    manifest.ManifestCargoItems.Add(new ManifestCargoItem
                    {
                        Id = Guid.NewGuid(),
                        DispatchManifestId = manifest.Id,
                        CargoId = cargoId,
                        CreatedAt = now,
                        UpdatedAt = now
                    });
                }

                await _manifestRepo.AddAsync(manifest, cancellationToken);
                savedManifests.Add(manifest);
            }

            // Update each assigned cargo's Status and TruckId.
            var assignedCargoIds = optimizationResult.Assignments
                .SelectMany(a => a.CargoIds)
                .ToHashSet();

            foreach (var cargo in pendingCargo.Where(c => assignedCargoIds.Contains(c.Id)))
            {
                var assignment = optimizationResult.Assignments
                    .First(a => a.CargoIds.Contains(cargo.Id));
                cargo.Status = CargoStatus.Assigned;
                cargo.TruckId = assignment.TruckId;
                cargo.UpdatedAt = now;
                await _cargoRepo.UpdateAsync(cargo, cancellationToken);
            }

            await _uow.CommitAsync(cancellationToken);
            sw.Stop();

            var truckCount = optimizationResult.Assignments.Count;
            var cargoCount = assignedCargoIds.Count;

            _logger.LogInformation(
                "Dispatch run completed using {Algorithm}. Packed {CargoCount} items into {TruckCount} trucks in {DurationMs}ms",
                algorithm, cargoCount, truckCount, sw.ElapsedMilliseconds);

            return new DispatchRunResult(
                savedManifests.AsReadOnly(),
                optimizationResult.UnassignedCargoIds.ToList().AsReadOnly(),
                optimizationResult.TotalPriorityScoreAchieved,
                algorithm,
                sw.ElapsedMilliseconds);
        }
        catch
        {
            await _uow.RollbackAsync(cancellationToken);
            _logger.LogError("Dispatch run failed and transaction was rolled back for algorithm {Algorithm}", algorithm);
            throw;
        }
    }
}

/// <summary>
/// Result of a completed dispatch run, including persisted manifests.
/// </summary>
public sealed record DispatchRunResult(
    IReadOnlyList<DispatchManifest> Manifests,
    IReadOnlyList<Guid> UnassignedCargoIds,
    decimal TotalPriorityScoreAchieved,
    AlgorithmType AlgorithmUsed,
    long ExecutionTimeMs
);
