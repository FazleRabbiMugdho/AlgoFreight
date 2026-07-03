namespace AlgoFreight.Application.Dtos;

public record CargoDto(
    Guid Id,
    string Description,
    decimal WeightKg,
    string Destination,
    string Priority,
    bool IsFragile,
    string Status,
    Guid? TruckId
);
