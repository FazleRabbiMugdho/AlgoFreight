using AlgoFreight.Domain.Enums;

namespace AlgoFreight.Application.Dtos;

public record DispatchResult(
    IReadOnlyList<TruckAssignment> Assignments,
    IReadOnlyList<Guid> UnassignedCargoIds,
    decimal TotalPriorityScoreAchieved,
    AlgorithmType AlgorithmUsed,
    long ExecutionTimeMs
);

public record TruckAssignment(
    Guid TruckId,
    IReadOnlyList<Guid> CargoIds
);
